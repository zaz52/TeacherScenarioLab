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
 * The rumor rule has one more gate: it does not fire if the teacher
 * already addressed the rumor with verification language in dialogue
 * (a message mentioning the rumor that also clarifies it). The training
 * has no separate "publish an explanation" action, so this dialogue proxy
 * is the signal — an acknowledged heuristic, not a proven publication:
 * a teacher message that merely promises to verify ("我去核实一下") does
 * not count, because it carries no clarification wording. If the teacher
 * clarifies only after the event fired, the fact stays unlocked (it is
 * history); its text always marks the rumor unverified.
 *
 * Firing happens inside the reply service transaction (see roleplay.ts):
 * evaluation is pure, persistence is atomic with the reply.
 */
import type { TrainingEventRecord } from '@openmaic/storage/training/pg';

export interface DynamicEventRule {
  event: string;
  afterUserMessages: number;
  /** When true, the event is skipped if the teacher already explained the beat in dialogue. */
  suppressIfTeacherExplained?: boolean;
}

const DYNAMIC_EVENT_RULES: Record<string, DynamicEventRule[]> = {
  'epi-class-fever': [
    { event: 'rumor-in-group', afterUserMessages: 3, suppressIfTeacherExplained: true },
  ],
};

/** Words that name the rumor beat in teacher dialogue. */
const RUMOR_KEYWORDS = ['瞒报', '传言', '谣言', '不实'];

/** Words showing the teacher gave a verified explanation, not just promised one. */
const CLARIFICATION_KEYWORDS = [
  '澄清',
  '说明',
  '辟谣',
  '已经核实',
  '核实过了',
  '核实结果',
  '官方通知',
  '以学校通知为准',
  '未经核实',
  '不属实',
];

function teacherExplainedRumor(teacherMessages: string[]): boolean {
  return teacherMessages.some(
    (message) =>
      RUMOR_KEYWORDS.some((keyword) => message.includes(keyword)) &&
      CLARIFICATION_KEYWORDS.some((keyword) => message.includes(keyword)),
  );
}

export function checkDynamicEvents(
  scenarioId: string,
  userMessageCount: number,
  events: TrainingEventRecord[],
  teacherMessages: string[] = [],
): string[] {
  const fired = new Set(events.map((event) => event.type));
  return (DYNAMIC_EVENT_RULES[scenarioId] ?? [])
    .filter((rule) => {
      if (userMessageCount < rule.afterUserMessages || fired.has(rule.event)) return false;
      if (rule.suppressIfTeacherExplained && teacherExplainedRumor(teacherMessages)) {
        return false;
      }
      return true;
    })
    .map((rule) => rule.event);
}
