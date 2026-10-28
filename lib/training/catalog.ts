/**
 * TeacherScenarioLab — learner-facing scenario catalog (training hall).
 *
 * Only published versions, only public fields. The mapping is the same
 * shape as the single-version public route: title, setting, goal, rules,
 * learner role, character names/roles. Facts and disclosure conditions
 * never leave the server — the filter and the strip are both here, so a
 * future caller cannot accidentally serve a draft or a fact table.
 */
import type { ScenarioVersionRecord } from '@openmaic/storage/training/pg';

import { getTrainingStore } from './server';

export interface PublicScenario {
  scenarioId: string;
  version: number;
  title: string;
  setting: string;
  goal: string;
  rules: string[];
  learnerRole: string;
  characters: Array<{ id: string; name: string; role: string }>;
  publishedAt: number;
}

/** Strip a stored version down to what a learner may see. */
export function toPublicScenario(record: ScenarioVersionRecord): PublicScenario {
  return {
    scenarioId: record.scenarioId,
    version: record.version,
    title: record.title,
    setting: record.setting,
    goal: record.goal,
    rules: record.rules,
    learnerRole: record.learnerRole,
    characters: record.characters.map((character) => ({
      id: character.id,
      name: character.name,
      role: character.role,
    })),
    publishedAt: record.publishedAt as number,
  };
}

/** Every published version, newest published first. Drafts excluded. */
export async function listPublishedScenarios(): Promise<PublicScenario[]> {
  const store = await getTrainingStore();
  const versions = await store.listAllScenarioVersions();
  return versions
    .filter((record) => record.publishedAt !== null)
    .map(toPublicScenario)
    .sort((a, b) => b.publishedAt - a.publishedAt);
}
