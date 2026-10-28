/**
 * TeacherScenarioLab — scenario and fact-table types.
 *
 * A scenario is a server-side entity with a version. Once published
 * (`publishedAt` set), its fact table is frozen: edits produce a new
 * version, and a training in progress stays bound to the version it was
 * created with. The client never receives the full fact table — only the
 * facts the disclosure engine has released (see task 5).
 */

import type { ScenarioVersionRecord } from '@openmaic/storage/training/pg';

import { isTrainingState, type TrainingState } from './state-machine';

export type FactVisibility = 'public' | 'character-private' | 'hidden';

export interface TrainingFact {
  /** Stable id, e.g. `fact-student-absence-1`. */
  id: string;
  content: string;
  /** e.g. `student`, `parent`, `policy`, `resource`, `timeline`. */
  category: string;
  visibility: FactVisibility;
  /** Required when visibility is `character-private`: the only role that knows it. */
  ownerCharacterId?: string;
  /** Disclosure condition id (see `DisclosureCondition`); required for `hidden` facts. */
  disclosureConditionId?: string;
}

export type DisclosureCondition =
  | { type: 'userAskedAbout'; topic: string }
  | { type: 'eventOccurred'; event: string }
  | { type: 'stateReached'; state: TrainingState };

export type TrainingCharacterRole =
  | 'student'
  | 'parent'
  | 'teacher'
  | 'principal'
  | 'other';

export interface ScenarioCharacterConfig {
  id: string;
  name: string;
  role: TrainingCharacterRole;
}

export interface ScenarioVersion {
  scenarioId: string;
  /** Monotonic per scenario; a new version is a new row, never an edit. */
  version: number;
  title: string;
  /** Epidemic-emergency education setting description. */
  setting: string;
  goal: string;
  rules: string[];
  /** The learner's role, e.g. `小学教师`. */
  learnerRole: string;
  characters: ScenarioCharacterConfig[];
  facts: TrainingFact[];
  disclosureConditions: Record<string, DisclosureCondition>;
  /** Null while draft. Publishing sets this timestamp and freezes the version. */
  publishedAt: number | null;
}

export function isPublishedScenario(version: ScenarioVersion): boolean {
  return version.publishedAt !== null;
}

/**
 * Narrow a storage scenario record to the domain ScenarioVersion. The
 * storage layer keeps disclosure-condition states as plain strings; the
 * domain narrows `stateReached` states to TrainingState. Returns null when
 * a stored condition names an unknown state — stored data that fails its
 * own shape is corruption, and callers must fail loudly (500), never
 * silently coerce it.
 */
export function toScenarioVersion(
  record: ScenarioVersionRecord,
): ScenarioVersion | null {
  const disclosureConditions: Record<string, DisclosureCondition> = {};
  for (const [id, condition] of Object.entries(record.disclosureConditions)) {
    if (condition.type === 'stateReached') {
      if (!isTrainingState(condition.state)) return null;
      disclosureConditions[id] = { type: 'stateReached', state: condition.state };
    } else {
      disclosureConditions[id] = condition;
    }
  }
  return { ...record, disclosureConditions };
}

/**
 * Validate a scenario version. Returns a list of problems (empty = valid).
 * Pure function, no I/O — covered by `tests/training/scenario.test.ts`.
 */
export function validateScenarioVersion(version: ScenarioVersion): string[] {
  const problems: string[] = [];
  if (!version.scenarioId) problems.push('scenarioId is empty');
  if (!Number.isInteger(version.version) || version.version < 1) {
    problems.push(`version must be a positive integer, got ${version.version}`);
  }
  if (!version.title) problems.push('title is empty');
  if (!version.setting) problems.push('setting is empty');
  if (!version.goal) problems.push('goal is empty');
  if (!version.learnerRole) problems.push('learnerRole is empty');

  const characterIds = new Set<string>();
  for (const character of version.characters) {
    if (!character.id) {
      problems.push('character with empty id');
      continue;
    }
    if (characterIds.has(character.id)) {
      problems.push(`duplicate character id: ${character.id}`);
    }
    characterIds.add(character.id);
    if (!character.name) problems.push(`character ${character.id} has empty name`);
  }

  const factIds = new Set<string>();
  for (const fact of version.facts) {
    if (!fact.id) {
      problems.push('fact with empty id');
      continue;
    }
    if (factIds.has(fact.id)) {
      problems.push(`duplicate fact id: ${fact.id}`);
    }
    factIds.add(fact.id);
    if (!fact.content) problems.push(`fact ${fact.id} has empty content`);
    if (fact.visibility === 'character-private') {
      if (!fact.ownerCharacterId) {
        problems.push(`private fact ${fact.id} has no ownerCharacterId`);
      } else if (!characterIds.has(fact.ownerCharacterId)) {
        problems.push(
          `private fact ${fact.id} owner ${fact.ownerCharacterId} is not a character`,
        );
      }
    }
    if (fact.visibility === 'hidden') {
      if (!fact.disclosureConditionId) {
        problems.push(`hidden fact ${fact.id} has no disclosureConditionId`);
      } else if (!(fact.disclosureConditionId in version.disclosureConditions)) {
        problems.push(
          `hidden fact ${fact.id} condition ${fact.disclosureConditionId} is not declared`,
        );
      }
    }
  }
  return problems;
}
