/**
 * TeacherScenarioLab — dynamic events (server only, pure evaluation).
 *
 * Some fiction beats are not user actions but things that happen as the
 * conversation unfolds: after enough teacher messages, the parent-group
 * rumor surfaces, which in turn unlocks the rumor hidden fact through its
 * `eventOccurred` disclosure condition. Rules are per-scenario and
 * deliberately small: an event fires once, when the teacher's message count
 * reaches its threshold and the ledger does not hold it yet.
 *
 * Firing happens inside the reply service transaction (see roleplay.ts):
 * evaluation is pure, persistence is atomic with the reply.
 */
import type { TrainingEventRecord } from '@openmaic/storage/training/pg';

export interface DynamicEventRule {
  event: string;
  afterUserMessages: number;
}

const DYNAMIC_EVENT_RULES: Record<string, DynamicEventRule[]> = {
  'epi-class-fever': [{ event: 'rumor-in-group', afterUserMessages: 3 }],
};

export function checkDynamicEvents(
  scenarioId: string,
  userMessageCount: number,
  events: TrainingEventRecord[],
): string[] {
  const fired = new Set(events.map((event) => event.type));
  return (DYNAMIC_EVENT_RULES[scenarioId] ?? [])
    .filter(
      (rule) => userMessageCount >= rule.afterUserMessages && !fired.has(rule.event),
    )
    .map((rule) => rule.event);
}
