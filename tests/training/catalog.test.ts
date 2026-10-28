import { describe, expect, test } from 'vitest';

import type { ScenarioVersionRecord } from '@openmaic/storage/training/pg';
import { toPublicScenario } from '@/lib/training/catalog';

function record(): ScenarioVersionRecord {
  return {
    scenarioId: 's',
    version: 1,
    title: 'Title',
    setting: 'Setting',
    goal: 'Goal',
    rules: ['rule'],
    learnerRole: '小学教师',
    characters: [{ id: 'parent-1', name: '家长', role: 'parent' }],
    facts: [
      {
        id: 'fact-secret',
        content: 'secret content',
        category: 'policy',
        visibility: 'character-private',
        ownerCharacterId: 'parent-1',
      },
    ],
    disclosureConditions: { cond: { type: 'userAskedAbout', topic: 'travel' } },
    publishedAt: 1000,
  };
}

describe('toPublicScenario', () => {
  test('strips facts and disclosure conditions', () => {
    const pub = toPublicScenario(record());
    expect(pub).toEqual({
      scenarioId: 's',
      version: 1,
      title: 'Title',
      setting: 'Setting',
      goal: 'Goal',
      rules: ['rule'],
      learnerRole: '小学教师',
      characters: [{ id: 'parent-1', name: '家长', role: 'parent' }],
      publishedAt: 1000,
    });
    expect('facts' in pub).toBe(false);
    expect('disclosureConditions' in pub).toBe(false);
  });
});
