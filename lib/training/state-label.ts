import { isTrainingState, type TrainingState } from './state-machine';

const stateKeys = {
  created: 'stateCreated',
  briefing: 'stateBriefing',
  'fact-checking': 'stateFactChecking',
  coordination: 'stateCoordination',
  proposal: 'stateProposal',
  evaluation: 'stateEvaluation',
  completed: 'stateCompleted',
} satisfies Record<TrainingState, string>;

/** Keep persisted state IDs stable and translate their learner-facing labels. */
export function trainingStateLabel(state: string, translate: (key: string) => string): string {
  return isTrainingState(state) ? translate(stateKeys[state]) : state;
}
