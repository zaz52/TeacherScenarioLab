/**
 * TeacherScenarioLab — disclosure engine (server only).
 *
 * Hidden facts stay hidden until their condition is satisfied:
 *
 * - `userAskedAbout { topic }`: some teacher message mentions the topic.
 *   Topics map to Chinese keywords here (the condition carries only a
 *   topic id); unknown topics fall back to matching the topic string
 *   itself as a substring.
 * - `eventOccurred { event }`: the training ledger already holds an event
 *   of that type (dynamic events fire these — see dynamic-events.ts).
 * - `stateReached { state }`: the training's current state is at or past
 *   that state in the linear state order.
 *
 * The engine is pure. `getDisclosedFactsForTraining` is the service
 * wrapper the disclosures route uses. Only unlocked facts are ever
 * returned — locked facts leave no trace (not even a count), so the
 * response cannot oracle how many secrets remain.
 */
import type {
  DisclosureCondition,
  ScenarioVersion,
  TrainingFact,
} from './scenario';
import { toScenarioVersion } from './scenario';
import { getTrainingStore } from './server';
import { TRAINING_TRANSITIONS } from './state-machine';
import { TrainingServiceError } from './store';

export interface DisclosureContext {
  state: string;
  /** Ledger events; only `type` is read, so not-yet-persisted dynamic events may join as `{ type }`. */
  events: Array<{ type: string }>;
  userMessages: string[];
}

const TOPIC_KEYWORDS: Record<string, string[]> = {
  // No scenario currently binds a userAskedAbout topic; the map stays as
  // the extension point and unknown topics fall back to substring matching
  // on the topic string itself. (The epidemic scenario's travel topic was
  // removed: unverified travel history must not imply a cause.)
};

export function isConditionSatisfied(
  condition: DisclosureCondition,
  context: DisclosureContext,
): boolean {
  switch (condition.type) {
    case 'userAskedAbout': {
      const keywords = TOPIC_KEYWORDS[condition.topic] ?? [condition.topic];
      return context.userMessages.some((message) =>
        keywords.some((keyword) => message.includes(keyword)),
      );
    }
    case 'eventOccurred':
      return context.events.some((event) => event.type === condition.event);
    case 'stateReached': {
      const order = Object.keys(TRAINING_TRANSITIONS);
      const current = order.indexOf(context.state);
      const target = order.indexOf(condition.state);
      return current >= 0 && target >= 0 && current >= target;
    }
  }
}

/** Hidden facts whose conditions are satisfied, in scenario order. */
export function getDisclosedFacts(
  scenario: ScenarioVersion,
  context: DisclosureContext,
): TrainingFact[] {
  return scenario.facts.filter((fact) => {
    if (fact.visibility !== 'hidden' || !fact.disclosureConditionId) return false;
    const condition = scenario.disclosureConditions[fact.disclosureConditionId];
    return condition !== undefined && isConditionSatisfied(condition, context);
  });
}

export async function getDisclosedFactsForTraining(
  ownerId: string,
  trainingId: string,
): Promise<{ training: { id: string; state: string }; facts: TrainingFact[] }> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const training = await store.getTraining(trainingId);
  if (!training) {
    throw new TrainingServiceError(404, 'TRAINING_NOT_FOUND', `training ${trainingId} was not found`);
  }
  const record = await store.getScenarioVersion(training.scenarioId, training.scenarioVersion);
  if (!record) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `training ${trainingId} pins missing scenario ${training.scenarioId} version ${training.scenarioVersion}`,
    );
  }
  const scenario = toScenarioVersion(record);
  if (!scenario) {
    throw new TrainingServiceError(
      500,
      'INVALID_REQUEST',
      `training ${trainingId} pins scenario with an unknown disclosure state`,
    );
  }
  const [events, messages] = await Promise.all([
    store.listEvents(trainingId),
    store.listMessages(trainingId, { includeSuperseded: false }),
  ]);
  const facts = getDisclosedFacts(scenario, {
    state: training.state,
    events,
    userMessages: messages.filter((m) => m.role === 'user').map((m) => m.content),
  });
  return { training: { id: training.id, state: training.state }, facts };
}
