/**
 * TeacherScenarioLab — scenario draft validation (pure, unit-testable).
 *
 * The admin editor posts an untyped JSON body; this module turns it into
 * either a clean {@link ScenarioVersion} (unknown extra keys dropped,
 * `publishedAt` forced to null — the editor never publishes) or a list of
 * human-readable issues. It is the first gate; the publish path still runs
 * `toScenarioVersion` over the stored document before freezing it.
 */
import { isTrainingState, type TrainingState } from './state-machine';
import type {
  DisclosureCondition,
  FactVisibility,
  ScenarioCharacterConfig,
  ScenarioVersion,
  TrainingCharacterRole,
  TrainingFact,
} from './scenario';

const SCENARIO_ID_PATTERN = /^[a-z0-9][a-z0-9-]*$/;
const CHARACTER_ROLES: TrainingCharacterRole[] = [
  'student',
  'parent',
  'teacher',
  'principal',
  'other',
];
const FACT_VISIBILITIES: FactVisibility[] = ['public', 'character-private', 'hidden'];

export interface ScenarioValidation {
  issues: string[];
  scenario: ScenarioVersion | null;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function nonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.trim().length > 0;
}

function stringList(value: unknown): string[] | null {
  if (!Array.isArray(value)) return null;
  const out: string[] = [];
  for (const item of value) {
    if (!nonEmptyString(item)) return null;
    out.push(item);
  }
  return out;
}

/**
 * Validate an editor payload. `scenarioId`/`version` are part of the
 * payload (the routes additionally check them against the URL path).
 */
export function validateScenarioVersion(value: unknown): ScenarioValidation {
  const issues: string[] = [];
  if (!isRecord(value)) {
    return { issues: ['scenario must be an object'], scenario: null };
  }

  const scenarioId = value.scenarioId;
  if (!nonEmptyString(scenarioId) || !SCENARIO_ID_PATTERN.test(scenarioId)) {
    issues.push('scenarioId must be a lowercase kebab-case id (letters, digits, dashes)');
  }
  const version = value.version;
  if (typeof version !== 'number' || !Number.isInteger(version) || version < 1) {
    issues.push('version must be a positive integer');
  }
  const title = value.title;
  if (!nonEmptyString(title)) issues.push('title is required');
  const setting = value.setting;
  if (!nonEmptyString(setting)) issues.push('setting is required');
  const goal = value.goal;
  if (!nonEmptyString(goal)) issues.push('goal is required');
  const learnerRole = value.learnerRole;
  if (!nonEmptyString(learnerRole)) issues.push('learnerRole is required');
  const rules = stringList(value.rules);
  if (rules === null) issues.push('rules must be an array of non-empty strings');

  const characterIds = new Set<string>();
  const characters: ScenarioCharacterConfig[] = [];
  if (!Array.isArray(value.characters) || value.characters.length === 0) {
    issues.push('characters must be a non-empty array');
  } else {
    for (const raw of value.characters) {
      if (!isRecord(raw)) {
        issues.push('each character must be an object');
        continue;
      }
      if (!nonEmptyString(raw.id)) {
        issues.push('each character needs a non-empty id');
        continue;
      }
      if (characterIds.has(raw.id)) {
        issues.push(`duplicate character id: ${raw.id}`);
        continue;
      }
      characterIds.add(raw.id);
      if (!nonEmptyString(raw.name)) {
        issues.push(`character ${raw.id} needs a non-empty name`);
        continue;
      }
      if (typeof raw.role !== 'string' || !(CHARACTER_ROLES as string[]).includes(raw.role)) {
        issues.push(
          `character ${raw.id} has an unknown role (student/parent/teacher/principal/other)`,
        );
        continue;
      }
      characters.push({ id: raw.id, name: raw.name, role: raw.role as TrainingCharacterRole });
    }
  }

  const conditionIds = new Set<string>();
  const disclosureConditions: Record<string, DisclosureCondition> = {};
  if (!isRecord(value.disclosureConditions)) {
    issues.push('disclosureConditions must be an object');
  } else {
    for (const [id, raw] of Object.entries(value.disclosureConditions)) {
      conditionIds.add(id);
      if (!isRecord(raw)) {
        issues.push(`disclosure condition ${id} must be an object`);
        continue;
      }
      if (raw.type === 'userAskedAbout') {
        if (!nonEmptyString(raw.topic)) {
          issues.push(`disclosure condition ${id} needs a non-empty topic`);
          continue;
        }
        disclosureConditions[id] = { type: 'userAskedAbout', topic: raw.topic };
      } else if (raw.type === 'eventOccurred') {
        if (!nonEmptyString(raw.event)) {
          issues.push(`disclosure condition ${id} needs a non-empty event`);
          continue;
        }
        disclosureConditions[id] = { type: 'eventOccurred', event: raw.event };
      } else if (raw.type === 'stateReached') {
        if (!isTrainingState(raw.state)) {
          issues.push(`disclosure condition ${id} names an unknown state`);
          continue;
        }
        disclosureConditions[id] = {
          type: 'stateReached',
          state: raw.state as TrainingState,
        };
      } else {
        issues.push(
          `disclosure condition ${id} has an unknown type (userAskedAbout/eventOccurred/stateReached)`,
        );
      }
    }
  }

  const factIds = new Set<string>();
  const facts: TrainingFact[] = [];
  if (!Array.isArray(value.facts)) {
    issues.push('facts must be an array');
  } else {
    for (const raw of value.facts) {
      if (!isRecord(raw)) {
        issues.push('each fact must be an object');
        continue;
      }
      if (!nonEmptyString(raw.id)) {
        issues.push('each fact needs a non-empty id');
        continue;
      }
      if (factIds.has(raw.id)) {
        issues.push(`duplicate fact id: ${raw.id}`);
        continue;
      }
      factIds.add(raw.id);
      if (!nonEmptyString(raw.content)) {
        issues.push(`fact ${raw.id} needs non-empty content`);
        continue;
      }
      if (!nonEmptyString(raw.category)) {
        issues.push(`fact ${raw.id} needs a non-empty category`);
        continue;
      }
      if (
        typeof raw.visibility !== 'string' ||
        !(FACT_VISIBILITIES as string[]).includes(raw.visibility)
      ) {
        issues.push(`fact ${raw.id} has an unknown visibility (public/character-private/hidden)`);
        continue;
      }
      const fact: TrainingFact = {
        id: raw.id,
        content: raw.content,
        category: raw.category,
        visibility: raw.visibility as FactVisibility,
      };
      if (raw.visibility === 'character-private') {
        if (!nonEmptyString(raw.ownerCharacterId) || !characterIds.has(raw.ownerCharacterId)) {
          issues.push(`private fact ${raw.id} needs an ownerCharacterId naming a character`);
          continue;
        }
        fact.ownerCharacterId = raw.ownerCharacterId;
      }
      if (raw.visibility === 'hidden') {
        if (
          !nonEmptyString(raw.disclosureConditionId) ||
          !conditionIds.has(raw.disclosureConditionId)
        ) {
          issues.push(`hidden fact ${raw.id} needs a disclosureConditionId naming a condition`);
          continue;
        }
        fact.disclosureConditionId = raw.disclosureConditionId;
      }
      facts.push(fact);
    }
  }

  if (issues.length > 0) return { issues, scenario: null };
  return {
    issues: [],
    scenario: {
      scenarioId: scenarioId as string,
      version: version as number,
      title: title as string,
      setting: setting as string,
      goal: goal as string,
      rules: rules as string[],
      learnerRole: learnerRole as string,
      characters,
      facts,
      disclosureConditions,
      publishedAt: null,
    },
  };
}
