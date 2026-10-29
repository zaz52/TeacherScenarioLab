/**
 * TeacherScenarioLab — admin service (admin role required at the route).
 *
 * Everything here runs on the unbound store: admin reads cross owners by
 * construction, which is why the only call sites are the admin routes
 * behind {@link withTrainingAdmin}. Learner routes never call these
 * functions. Admin reads return full documents (scenario facts included):
 * review is the point, and the role check is the boundary.
 *
 * Publishing freezes a draft: the stored document is validated first, then
 * saved with `publishedAt` set. A published version can never be
 * overwritten (the store enforces it); there is no unpublish in this task.
 * Importing a code draft refuses when that version already exists, so an
 * import can never clobber a row an admin already reviewed.
 */
import type {
  ScenarioVersionRecord,
  TrainingEvaluationRecord,
  TrainingEventRecord,
  TrainingMessageRecord,
  TrainingRecord,
} from '@openmaic/storage/training/pg';

import type { OwnerPrincipal } from '@/lib/server/identity/types';

import { getCodeScenarioDraft } from './scenarios';
import { toScenarioVersion } from './scenario';
import { validateScenarioVersion } from './scenario-validation';
import { getTrainingStore } from './server';
import { isTrainingAdmin } from './session-auth';
import { TrainingServiceError } from './store';

/** Throws 403 unless the principal carries the admin role. */
export function requireTrainingAdmin(principal: OwnerPrincipal): void {
  if (!isTrainingAdmin(principal)) {
    throw new TrainingServiceError(403, 'TRAINING_ADMIN_REQUIRED', 'admin role required');
  }
}

/** Every scenario version in the library, drafts included, for review. */
export async function listAllScenarios(): Promise<ScenarioVersionRecord[]> {
  const store = await getTrainingStore();
  return store.listAllScenarioVersions();
}

/** One scenario version, full document, for admin review. */
export async function getScenarioForAdmin(
  scenarioId: string,
  version: number,
): Promise<ScenarioVersionRecord> {
  const store = await getTrainingStore();
  const record = await store.getScenarioVersion(scenarioId, version);
  if (!record)
    throw new TrainingServiceError(
      404,
      'SCENARIO_NOT_FOUND',
      `scenario ${scenarioId} version ${version} was not found`,
    );
  return record;
}

/**
 * Import a code draft into the database as a draft version. Refuses when
 * the version already exists (draft or published) and when the code knows
 * no draft by that id.
 */
export async function importCodeScenarioDraft(scenarioId: string): Promise<ScenarioVersionRecord> {
  const draft = getCodeScenarioDraft(scenarioId);
  if (!draft) {
    throw new TrainingServiceError(
      404,
      'SCENARIO_NOT_FOUND',
      `no code draft for scenario ${scenarioId}`,
    );
  }
  const store = await getTrainingStore();
  const validated = toScenarioVersion({
    ...draft,
    publishedAt: null,
  } as ScenarioVersionRecord);
  if (!validated) {
    throw new TrainingServiceError(
      500,
      'INTERNAL_ERROR',
      `code draft ${scenarioId} fails validation`,
    );
  }
  const created = await store.createScenarioVersion({
    ...draft,
    publishedAt: null,
  });
  if (!created) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `scenario ${draft.scenarioId} version ${draft.version} already exists`,
    );
  }
  return created;
}

/**
 * Publish a draft version: validate the stored document, then freeze it
 * with `publishedAt` set. Missing → 404; already published → 409 (a
 * concurrent publish surfaces as the store's frozen error, converted).
 */
export async function publishScenarioVersion(
  scenarioId: string,
  version: number,
): Promise<ScenarioVersionRecord> {
  const store = await getTrainingStore();
  const record = await store.getScenarioVersion(scenarioId, version);
  if (!record) {
    throw new TrainingServiceError(
      404,
      'SCENARIO_NOT_FOUND',
      `scenario ${scenarioId} version ${version} was not found`,
    );
  }
  if (record.publishedAt !== null) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `scenario ${scenarioId} version ${version} is already published`,
    );
  }
  const validated = toScenarioVersion(record);
  if (!validated) {
    throw new TrainingServiceError(
      500,
      'INTERNAL_ERROR',
      `stored scenario ${scenarioId} version ${version} fails validation`,
    );
  }
  try {
    return await store.saveScenarioVersion({ ...record, publishedAt: Date.now() });
  } catch (error) {
    if (error instanceof Error && error.name === 'TrainingScenarioFrozenError') {
      throw new TrainingServiceError(
        409,
        'TRAINING_STATE_CONFLICT',
        `scenario ${scenarioId} version ${version} is already published`,
      );
    }
    throw error;
  }
}

export interface AdminTrainingFilters {
  ownerId?: string;
  state?: string;
}

/**
 * Create a draft scenario version from an editor payload. The payload is
 * validated first (400 with the issue list); creation is a single atomic
 * INSERT, so a concurrent duplicate — draft or published — refuses with
 * 409 instead of overwriting. The stored row is always a draft:
 * `publishedAt` is forced to null.
 */
export async function createScenarioDraft(input: unknown): Promise<ScenarioVersionRecord> {
  const { issues, scenario } = validateScenarioVersion(input);
  if (!scenario) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      `scenario validation failed: ${issues.join('; ')}`,
    );
  }
  const store = await getTrainingStore();
  const created = await store.createScenarioVersion({
    ...scenario,
    publishedAt: null,
  });
  if (!created) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `scenario ${scenario.scenarioId} version ${scenario.version} already exists`,
    );
  }
  return created;
}

/**
 * Update a draft scenario version from an editor payload. The path
 * (scenarioId, version) must match the payload; a missing version → 404;
 * a published version → 409 (frozen: edit by creating a new version).
 */
export async function updateScenarioDraft(
  scenarioId: string,
  version: number,
  input: unknown,
): Promise<ScenarioVersionRecord> {
  const { issues, scenario } = validateScenarioVersion(input);
  if (!scenario) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      `scenario validation failed: ${issues.join('; ')}`,
    );
  }
  if (scenario.scenarioId !== scenarioId || scenario.version !== version) {
    throw new TrainingServiceError(
      400,
      'INVALID_REQUEST',
      'scenario id and version in the payload must match the URL path',
    );
  }
  const store = await getTrainingStore();
  const existing = await store.getScenarioVersion(scenarioId, version);
  if (!existing) {
    throw new TrainingServiceError(
      404,
      'SCENARIO_NOT_FOUND',
      `scenario ${scenarioId} version ${version} was not found`,
    );
  }
  if (existing.publishedAt !== null) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `scenario ${scenarioId} version ${version} is published and frozen`,
    );
  }
  return store.saveScenarioVersion({ ...scenario, publishedAt: null });
}

/**
 * Delete a draft scenario version. Missing → 404; published → 409 (a
 * published version is history for every training bound to it). A false
 * return from the store means the row changed concurrently — surfaced
 * as a conflict, never as a silent success.
 */
export async function deleteScenarioDraft(scenarioId: string, version: number): Promise<void> {
  const store = await getTrainingStore();
  const existing = await store.getScenarioVersion(scenarioId, version);
  if (!existing) {
    throw new TrainingServiceError(
      404,
      'SCENARIO_NOT_FOUND',
      `scenario ${scenarioId} version ${version} was not found`,
    );
  }
  if (existing.publishedAt !== null) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `scenario ${scenarioId} version ${version} is published and frozen`,
    );
  }
  const deleted = await store.deleteScenarioVersion(scenarioId, version);
  if (!deleted) {
    throw new TrainingServiceError(
      409,
      'TRAINING_STATE_CONFLICT',
      `scenario ${scenarioId} version ${version} changed concurrently`,
    );
  }
}

/**
 * Every training, across owners, newest first. Optional filters are
 * applied after the list: admin spot-check volume is small, and the store
 * offers no filtered list. The filters narrow, never widen.
 */
export async function listAllTrainings(
  filters: AdminTrainingFilters = {},
): Promise<TrainingRecord[]> {
  const store = await getTrainingStore();
  const trainings = await store.listTrainings({ includeAllOwners: true });
  return trainings.filter(
    (training) =>
      (filters.ownerId === undefined || training.ownerId === filters.ownerId) &&
      (filters.state === undefined || training.state === filters.state),
  );
}

export interface AdminTrainingDetail {
  training: TrainingRecord;
  messages: TrainingMessageRecord[];
  events: TrainingEventRecord[];
  evaluation: TrainingEvaluationRecord | null;
}

/** One training with its full ledger, for spot checks. */
export async function getTrainingForAdmin(trainingId: string): Promise<AdminTrainingDetail> {
  const store = await getTrainingStore();
  const training = await store.getTraining(trainingId);
  if (!training) {
    throw new TrainingServiceError(
      404,
      'TRAINING_NOT_FOUND',
      `training ${trainingId} was not found`,
    );
  }
  const [messages, events, evaluation] = await Promise.all([
    store.listMessages(trainingId, { includeSuperseded: true }),
    store.listEvents(trainingId),
    store.getEvaluation(trainingId),
  ]);
  return { training, messages, events, evaluation };
}
