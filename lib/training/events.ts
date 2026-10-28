/**
 * TeacherScenarioLab — learner event center.
 *
 * The ledger across the learner's own trainings, newest first: every
 * training-started, message, reply, transition, dynamic event, and
 * evaluation-completed entry, each tagged with its training and scenario
 * so the timeline reads as one story. Owner-scoped by construction — the
 * store is bound to the caller, so another learner's ledger is unreachable.
 * Cross-learner inspection lives only in the admin service.
 */
import type { TrainingEventRecord } from '@openmaic/storage/training/pg';

import { getTrainingStore } from './server';

export interface LearnerEvent {
  id: string;
  trainingId: string;
  scenarioId: string;
  scenarioVersion: number;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
}

export interface LearnerEventFilters {
  trainingId?: string;
  type?: string;
}

/** The caller's ledger, newest first, optionally narrowed. */
export async function listOwnEvents(
  ownerId: string,
  filters: LearnerEventFilters = {},
): Promise<LearnerEvent[]> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const trainings = await store.listTrainings();
  const wanted = trainings.filter(
    (training) => filters.trainingId === undefined || training.id === filters.trainingId,
  );
  const perTraining = await Promise.all(
    wanted.map(async (training) => {
      const events = await store.listEvents(training.id);
      return events.map((event: TrainingEventRecord): LearnerEvent => ({
        id: event.id,
        trainingId: training.id,
        scenarioId: training.scenarioId,
        scenarioVersion: training.scenarioVersion,
        type: event.type,
        payload: event.payload,
        createdAt: event.createdAt,
      }));
    }),
  );
  return perTraining
    .flat()
    .filter((event) => filters.type === undefined || event.type === filters.type)
    .sort((a, b) => b.createdAt - a.createdAt || (a.id < b.id ? -1 : 1));
}
