/**
 * TeacherScenarioLab — training service layer (server only).
 *
 * The single place routes talk to the training store. Every function takes
 * the request's trusted owner id (from withRequestOwner) and binds the
 * store to it, so a training is only ever visible to its owner. Hidden
 * scenario facts never pass through here to the client: routes return
 * training records (which carry no facts) and user messages only — the
 * scenario document itself is read here solely to validate that a
 * training may start, and is never serialized into a response.
 */
import { randomUUID } from 'node:crypto';

import type {
  TrainingEventRecord,
  TrainingMessageRecord,
  TrainingRecord,
} from '@openmaic/storage/training/pg';

import { isValidIdempotencyKey } from './idempotency';
import { toScenarioVersion, validateScenarioVersion } from './scenario';
import { getTrainingStore } from './server';
import {
  canTransition,
  isTrainingState,
  MESSAGEABLE_STATES,
  type TrainingState,
} from './state-machine';

/** User message text cap; mirrors the agent session text cap. */
export const TRAINING_MESSAGE_MAX_LENGTH = 100_000;

/** States in which the learner may send a message. */

export class TrainingServiceError extends Error {
  readonly status: number;
  readonly code: string;

  constructor(status: number, code: string, message: string) {
    super(message);
    this.name = 'TrainingServiceError';
    this.status = status;
    this.code = code;
  }
}

function notFound(what: string, id: string): TrainingServiceError {
  return new TrainingServiceError(404, 'TRAINING_NOT_FOUND', `${what} ${id} was not found`);
}

/**
 * Start a training from a published scenario version. Draft versions can
 * never start a training: publishing freezes the version, and the training
 * pins (scenarioId, scenarioVersion) so later edits cannot change a
 * training already in progress.
 */
export async function createTraining(
  ownerId: string,
  input: { scenarioId: string; scenarioVersion: number },
): Promise<TrainingRecord> {
  const scenarioId = input.scenarioId?.trim();
  if (!scenarioId) {
    throw new TrainingServiceError(400, 'MISSING_REQUIRED_FIELD', 'scenarioId is required');
  }
  if (!Number.isInteger(input.scenarioVersion) || input.scenarioVersion < 1) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      'scenarioVersion must be a positive integer',
    );
  }
  const store = (await getTrainingStore()).forOwner(ownerId);
  const scenario = await store.getScenarioVersion(scenarioId, input.scenarioVersion);
  if (!scenario) {
    throw new TrainingServiceError(
      404,
      'SCENARIO_NOT_FOUND',
      `scenario ${scenarioId} version ${input.scenarioVersion} was not found`,
    );
  }
  if (scenario.publishedAt === null) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      `scenario ${scenarioId} version ${input.scenarioVersion} is not published`,
    );
  }
  const version = toScenarioVersion(scenario);
  if (!version) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `stored scenario ${scenarioId} version ${input.scenarioVersion} has an unknown disclosure state`,
    );
  }
  const validationErrors = validateScenarioVersion(version);
  if (validationErrors.length > 0) {
    // Stored data that fails its own validation is a server data bug, not
    // a client error: fail loudly instead of starting a broken training.
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `stored scenario failed validation: ${validationErrors.join('; ')}`,
    );
  }
  const now = Date.now();
  const trainingId = randomUUID();
  return store.withTransaction(async (tx) => {
    const training = await tx.createTraining({
      id: trainingId,
      ownerId,
      scenarioId,
      scenarioVersion: input.scenarioVersion,
      state: 'created',
      now,
    });
    await tx.appendEvent({
      id: randomUUID(),
      trainingId,
      type: 'training-created',
      payload: { scenarioId, scenarioVersion: input.scenarioVersion },
      createdAt: now,
    });
    return training;
  });
}

/** Move a created training into briefing (the learner starts engaging). */
export async function startTraining(
  ownerId: string,
  trainingId: string,
): Promise<TrainingRecord> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) throw notFound('training', trainingId);
  if (!isTrainingState(training.state)) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `training ${trainingId} has unknown stored state ${training.state}`,
    );
  }
  if (!canTransition(training.state, 'briefing')) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `training ${trainingId} is in state ${training.state}, cannot start`,
    );
  }
  const now = Date.now();
  const moved = await store.withTransaction(async (tx) => {
    const ok = await tx.transitionState(trainingId, training.state, 'briefing', now);
    if (!ok) return false;
    await tx.appendEvent({
      id: randomUUID(),
      trainingId,
      type: 'training-started',
      payload: {},
      createdAt: now,
    });
    return true;
  });
  if (!moved) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `training ${trainingId} changed state concurrently`,
    );
  }
  const updated = await store.getTraining(trainingId);
  if (!updated) throw notFound('training', trainingId);
  return updated;
}

/**
 * Move a training to a later state (the general stage progression; `start`
 * stays as the explicit created → briefing entry). Illegal transitions
 * fail with 409; the move and its ledger event commit atomically.
 */
export async function transitionTraining(
  ownerId: string,
  trainingId: string,
  to: TrainingState,
): Promise<TrainingRecord> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) throw notFound('training', trainingId);
  if (!isTrainingState(training.state)) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `training ${trainingId} has unknown stored state ${training.state}`,
    );
  }
  if (!canTransition(training.state, to)) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `training ${trainingId} is in state ${training.state}, cannot move to ${to}`,
    );
  }
  const now = Date.now();
  const moved = await store.withTransaction(async (tx) => {
    const ok = await tx.transitionState(trainingId, training.state, to, now);
    if (!ok) return false;
    await tx.appendEvent({
      id: randomUUID(),
      trainingId,
      type: 'training-transition',
      payload: { from: training.state, to },
      createdAt: now,
    });
    return true;
  });
  if (!moved) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `training ${trainingId} changed state concurrently`,
    );
  }
  const updated = await store.getTraining(trainingId);
  if (!updated) throw notFound('training', trainingId);
  return updated;
}

export async function getTraining(
  ownerId: string,
  trainingId: string,
): Promise<TrainingRecord | null> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  return store.getTraining(trainingId);
}

export async function listTrainings(ownerId: string): Promise<TrainingRecord[]> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  return store.listTrainings();
}

/**
 * Append a learner message. A repeated idempotency key returns the first
 * message (deduped: true) without a second ledger event, so a retried
 * request never double-counts.
 */
export async function appendUserMessage(
  ownerId: string,
  trainingId: string,
  input: { content: string; idempotencyKey?: string | null },
): Promise<{ message: TrainingMessageRecord; deduped: boolean }> {
  const content = typeof input.content === 'string' ? input.content.trim() : '';
  if (!content) {
    throw new TrainingServiceError(400, 'MISSING_REQUIRED_FIELD', 'content is required');
  }
  if (content.length > TRAINING_MESSAGE_MAX_LENGTH) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      `content exceeds the ${TRAINING_MESSAGE_MAX_LENGTH} character limit`,
    );
  }
  const idempotencyKey = input.idempotencyKey ?? null;
  if (idempotencyKey !== null && !isValidIdempotencyKey(idempotencyKey)) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      'idempotencyKey must be a UUID',
    );
  }
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) throw notFound('training', trainingId);
  if (!(MESSAGEABLE_STATES as readonly string[]).includes(training.state)) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `training ${trainingId} is in state ${training.state}, cannot accept messages`,
    );
  }
  const now = Date.now();
  return store.withTransaction(async (tx) => {
    const result = await tx.appendMessage({
      id: randomUUID(),
      trainingId,
      characterId: null,
      role: 'user',
      content,
      idempotencyKey,
      createdAt: now,
    });
    if (!result.deduped) {
      await tx.appendEvent({
        id: randomUUID(),
        trainingId,
        type: 'user-message',
        payload: { messageId: result.message.id },
        createdAt: now,
      });
    }
    return result;
  });
}

export async function listMessages(
  ownerId: string,
  trainingId: string,
  includeSuperseded: boolean,
): Promise<TrainingMessageRecord[]> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) throw notFound('training', trainingId);
  return store.listMessages(trainingId, { includeSuperseded });
}

export async function listEvents(
  ownerId: string,
  trainingId: string,
): Promise<TrainingEventRecord[]> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) throw notFound('training', trainingId);
  return store.listEvents(trainingId);
}
