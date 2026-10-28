/**
 * TeacherScenarioLab — code-defined scenario drafts.
 *
 * Drafts live in code until an admin imports one into the database
 * (POST /api/training/admin/scenarios/import); only the admin publish
 * endpoint can make a version visible to learners. Nothing here is
 * published by importing or by existing: the public scenario route treats
 * every draft as not-found.
 */
import type { ScenarioVersion } from '../scenario';
import { EPIDEMIC_SCENARIO_V1_DRAFT } from './epidemic-v1';

/** Code drafts, by scenario id. */
export const CODE_SCENARIO_DRAFTS: Record<string, ScenarioVersion> = {
  [EPIDEMIC_SCENARIO_V1_DRAFT.scenarioId]: EPIDEMIC_SCENARIO_V1_DRAFT,
};

/** A code draft by scenario id, or `undefined` when the code knows none. */
export function getCodeScenarioDraft(scenarioId: string): ScenarioVersion | undefined {
  return CODE_SCENARIO_DRAFTS[scenarioId];
}
