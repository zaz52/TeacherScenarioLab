import { describe, expect, test } from 'vitest';

import { validateScenarioVersion } from '@/lib/training/scenario-validation';

function validDoc(): Record<string, unknown> {
  return {
    scenarioId: 'editor-unit-scenario',
    version: 2,
    title: 'Unit scenario',
    setting: 'Setting',
    goal: 'Goal',
    rules: ['rule 1', 'rule 2'],
    learnerRole: '小学教师',
    characters: [
      { id: 'parent-1', name: '家长', role: 'parent' },
      { id: 'student-1', name: '学生', role: 'student' },
    ],
    facts: [
      { id: 'fact-public', content: 'open', category: 'policy', visibility: 'public' },
      {
        id: 'fact-private',
        content: 'secret',
        category: 'policy',
        visibility: 'character-private',
        ownerCharacterId: 'parent-1',
      },
      {
        id: 'fact-hidden',
        content: 'rumor',
        category: 'timeline',
        visibility: 'hidden',
        disclosureConditionId: 'rumor-in-group',
      },
    ],
    disclosureConditions: {
      'rumor-in-group': { type: 'eventOccurred', event: 'rumor' },
    },
  };
}

describe('validateScenarioVersion', () => {
  test('accepts a well-formed draft and forces publishedAt null', () => {
    const { issues, scenario } = validateScenarioVersion(validDoc());
    expect(issues).toEqual([]);
    expect(scenario).not.toBeNull();
    expect(scenario?.publishedAt).toBeNull();
    expect(scenario?.facts).toHaveLength(3);
  });

  test('rejects a bad id, a bad version and missing text fields', () => {
    const doc = validDoc();
    doc.scenarioId = 'Bad_ID';
    doc.version = 0;
    doc.title = '';
    const { issues, scenario } = validateScenarioVersion(doc);
    expect(scenario).toBeNull();
    expect(issues.join(' ')).toMatch(/scenarioId/);
    expect(issues.join(' ')).toMatch(/version/);
    expect(issues.join(' ')).toMatch(/title/);
  });

  test('rejects duplicate character ids and unknown roles', () => {
    const dup = validDoc();
    dup.characters = [
      { id: 'parent-1', name: '家长', role: 'parent' },
      { id: 'parent-1', name: '另一家长', role: 'parent' },
    ];
    const dupResult = validateScenarioVersion(dup);
    expect(dupResult.scenario).toBeNull();
    expect(dupResult.issues.join(' ')).toMatch(/duplicate character id/);
    const badRole = validDoc();
    badRole.characters = [
      { id: 'parent-1', name: '家长', role: 'parent' },
      { id: 'wizard-1', name: '巫师', role: 'wizard' },
    ];
    const roleResult = validateScenarioVersion(badRole);
    expect(roleResult.scenario).toBeNull();
    expect(roleResult.issues.join(' ')).toMatch(/unknown role/);
  });

  test('private facts need a real owner, hidden facts need a real condition', () => {
    const doc = validDoc();
    (doc.facts as Array<Record<string, unknown>>)[1].ownerCharacterId = 'ghost-1';
    (doc.facts as Array<Record<string, unknown>>)[2].disclosureConditionId = 'nope';
    const { issues, scenario } = validateScenarioVersion(doc);
    expect(scenario).toBeNull();
    expect(issues.join(' ')).toMatch(/ownerCharacterId/);
    expect(issues.join(' ')).toMatch(/disclosureConditionId/);
  });

  test('unknown condition types and states are rejected', () => {
    const doc = validDoc();
    doc.disclosureConditions = {
      bad: { type: 'whenever' },
      'bad-state': { type: 'stateReached', state: 'graduated' },
    };
    const { issues, scenario } = validateScenarioVersion(doc);
    expect(scenario).toBeNull();
    expect(issues.join(' ')).toMatch(/unknown type/);
    expect(issues.join(' ')).toMatch(/unknown state/);
  });

  test('unknown extra keys are dropped, not errors', () => {
    const doc = { ...validDoc(), extraKey: 'ignored', publishedAt: 12345 };
    const { issues, scenario } = validateScenarioVersion(doc);
    expect(issues).toEqual([]);
    expect(scenario?.publishedAt).toBeNull();
  });
});
