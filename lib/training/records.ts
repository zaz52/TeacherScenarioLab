/**
 * TeacherScenarioLab — learner training records with five-dimension trends.
 *
 * One fetch for the records page: the learner's trainings, each with its
 * evaluation when one exists, plus the trend — the mean score per
 * dimension across all evaluated trainings, with the count that mean
 * rests on. Unevaluated trainings appear in the list with a null
 * evaluation; they never dilute the trend. Owner-scoped by construction.
 */
import type { TrainingEvaluationRecord, TrainingRecord } from '@openmaic/storage/training/pg';

import { EVALUATION_DIMENSIONS, type EvaluationDimension } from './evaluation';
import { getTrainingStore } from './server';

export interface TrainingRecordEntry {
  training: TrainingRecord;
  evaluation: TrainingEvaluationRecord | null;
}

export interface DimensionTrend {
  dimension: EvaluationDimension;
  average: number;
  count: number;
}

export interface TrainingRecords {
  records: TrainingRecordEntry[];
  trend: DimensionTrend[];
}

/** The learner's trainings with evaluations and the dimension trend. */
export async function getTrainingRecords(ownerId: string): Promise<TrainingRecords> {
  const store = (await getTrainingStore()).forOwner(ownerId);
  const trainings = await store.listTrainings();
  const records = await Promise.all(
    trainings.map(
      async (training): Promise<TrainingRecordEntry> => ({
        training,
        evaluation: await store.getEvaluation(training.id),
      }),
    ),
  );
  const sums = new Map<EvaluationDimension, { total: number; count: number }>();
  for (const dimension of EVALUATION_DIMENSIONS) {
    sums.set(dimension, { total: 0, count: 0 });
  }
  for (const record of records) {
    if (!record.evaluation) continue;
    for (const scored of record.evaluation.dimensions) {
      const entry = sums.get(scored.dimension as EvaluationDimension);
      if (!entry) continue;
      entry.total += scored.score;
      entry.count += 1;
    }
  }
  const trend = EVALUATION_DIMENSIONS.map((dimension) => {
    const entry = sums.get(dimension) as { total: number; count: number };
    return {
      dimension,
      average: entry.count === 0 ? 0 : Math.round((entry.total / entry.count) * 10) / 10,
      count: entry.count,
    };
  });
  return { records, trend };
}
