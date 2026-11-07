import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import { accountTransaction } from '@/lib/server/accounts/database';
import { getTrainingStore } from './server';
import { TrainingServiceError } from './store';
import {
  buildEmergencyBoard,
  EMERGENCY_ACTIONS,
  type EmergencyEvent,
  type EmergencyMessage,
} from './emergency-plan';

const decisionSchema = z
  .object({
    actionId: z.enum(EMERGENCY_ACTIONS),
    choiceId: z.string().min(1).max(40),
    confirmed: z.string().trim().min(2).max(800),
    unknown: z.string().trim().min(2).max(800),
    action: z.string().trim().min(10).max(800),
    contact: z.string().trim().min(2).max(200),
    followUp: z.string().trim().min(2).max(400),
    evidenceMessageIds: z.array(z.string().uuid()).max(3),
    requestId: z.string().uuid(),
  })
  .strict();
function fail(status: number, code = 'INVALID_REQUEST'): never {
  throw new TrainingServiceError(status, code, code);
}

export async function getEmergencyBoard(ownerId: string, trainingId: string) {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) fail(404, 'TRAINING_NOT_FOUND');
  const scenario = await store.getScenarioVersion(training.scenarioId, training.scenarioVersion);
  if (!scenario) fail(404, 'SCENARIO_NOT_FOUND');
  const [messages, events] = await Promise.all([
    store.listMessages(trainingId, { includeSuperseded: false }),
    store.listEvents(trainingId),
  ]);
  return buildEmergencyBoard(training, scenario, messages, events);
}

export async function recordEmergencyDecision(ownerId: string, trainingId: string, input: unknown) {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) fail(400);
  const decision = parsed.data;
  await getTrainingStore();
  return accountTransaction(async (tx) => {
    // The existing training row serializes decisions with stage changes and owner claims.
    const result = await tx.query(
      'SELECT scenario_id,scenario_version,state FROM trainings WHERE id=$1 AND owner_id=$2 FOR UPDATE',
      [trainingId, ownerId],
    );
    const row = result.rows[0];
    if (!row) fail(404, 'TRAINING_NOT_FOUND');
    const eventRows = await tx.query(
      'SELECT id,type,payload,created_at FROM training_events WHERE training_id=$1 ORDER BY created_at,id',
      [trainingId],
    );
    const events: EmergencyEvent[] = eventRows.rows.map((e) => ({
      ...e,
      createdAt: Number(e.created_at),
    }));
    const previous = events.find(
      (e) => e.type === 'emergency-decision-recorded' && e.payload.requestId === decision.requestId,
    );
    if (previous) {
      if (
        Object.keys(decision).some(
          (k) =>
            JSON.stringify(previous.payload[k]) !==
            JSON.stringify(decision[k as keyof typeof decision]),
        )
      )
        fail(409);
      return { eventId: previous.id, deduplicated: true };
    }
    if (!['created', 'briefing', 'fact-checking', 'coordination', 'proposal'].includes(row.state))
      fail(409, 'TRAINING_STATE_CONFLICT');
    // Read the frozen version through the public store interface, on the same configured database.
    const scenario = await (await getTrainingStore())
      .forOwner(ownerId)
      .getScenarioVersion(row.scenario_id, row.scenario_version);
    if (!scenario) fail(404, 'SCENARIO_NOT_FOUND');
    const messageRows = await tx.query(
      'SELECT id,role,content FROM training_messages WHERE training_id=$1 AND superseded_by IS NULL ORDER BY created_at,id',
      [trainingId],
    );
    const messages = messageRows.rows as EmergencyMessage[];
    const board = buildEmergencyBoard(
      { state: row.state, scenarioId: row.scenario_id },
      scenario,
      messages,
      events,
    );
    const task = board.tasks.find((t) => t.id === decision.actionId);
    if (!task?.available || !(task.choices as readonly string[]).includes(decision.choiceId))
      fail(409);
    if (
      decision.evidenceMessageIds.some(
        (id) => !messages.some((m) => m.id === id && m.role === 'user'),
      )
    )
      fail(400);
    const id = randomUUID(),
      now = Date.now();
    await tx.query(
      'INSERT INTO training_events(id,training_id,type,payload,created_at) VALUES($1,$2,$3,$4,$5)',
      [id, trainingId, 'emergency-decision-recorded', { version: 1, ...decision }, now],
    );
    await tx.query(
      'UPDATE trainings SET updated_at=GREATEST(updated_at,$3) WHERE id=$1 AND owner_id=$2',
      [trainingId, ownerId, now],
    );
    return { eventId: id, deduplicated: false };
  });
}
