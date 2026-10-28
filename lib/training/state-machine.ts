/**
 * TeacherScenarioLab — training state machine (deterministic, pure).
 *
 * The state machine is owned by program rules, never by the model: a
 * transition is legal only if it appears in TRAINING_TRANSITIONS, and the
 * server rejects anything else with the current state. The model may
 * *propose* progress through dialogue; only the server moves the state.
 */

export const TRAINING_STATES = [
  'created',
  'briefing',
  'fact-checking',
  'coordination',
  'proposal',
  'evaluation',
  'completed',
] as const;

export type TrainingState = (typeof TRAINING_STATES)[number];

/**
 * Legal transitions. The chain is linear by design: fact-checking must
 * complete before coordination, a proposal must exist before evaluation,
 * and a completed training is read-only (no outgoing transitions).
 */
export const TRAINING_TRANSITIONS: Record<TrainingState, readonly TrainingState[]> = {
  created: ['briefing'],
  briefing: ['fact-checking'],
  'fact-checking': ['coordination'],
  coordination: ['proposal'],
  proposal: ['evaluation'],
  evaluation: ['completed'],
  completed: [],
};

export function isTrainingState(value: unknown): value is TrainingState {
  return (
    typeof value === 'string' &&
    (TRAINING_STATES as readonly string[]).includes(value)
  );
}

/** Whether `to` is a legal move from `from`. */
export function canTransition(from: TrainingState, to: TrainingState): boolean {
  return TRAINING_TRANSITIONS[from].includes(to);
}

/** Legal next states from `state` (empty for `completed`). */
export function nextStates(state: TrainingState): TrainingState[] {
  return [...TRAINING_TRANSITIONS[state]];
}

/**
 * States in which the learner may send messages. Single source of truth
 * for the server gates (store, roleplay) and the room page: `created`
 * has no dialogue yet, `evaluation`/`completed` are read-only.
 */
export const MESSAGEABLE_STATES: readonly TrainingState[] = [
  'briefing',
  'fact-checking',
  'coordination',
  'proposal',
];
