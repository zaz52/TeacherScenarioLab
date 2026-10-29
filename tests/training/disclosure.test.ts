import { describe, expect, test } from 'vitest';

import { getDisclosedFacts, isConditionSatisfied } from '@/lib/training/disclosure';
import { EPIDEMIC_SCENARIO_V1_DRAFT } from '@/lib/training/scenarios/epidemic-v1';

const base = { state: 'briefing', events: [], userMessages: [] as string[] };

describe('isConditionSatisfied', () => {
  test('userAskedAbout falls back to substring matching for unmapped topics', () => {
    // Engine capability, tested on a synthetic condition: the epidemic
    // scenario no longer binds any userAskedAbout topic (travel was
    // removed so unverified travel history cannot imply a cause).
    const condition = { type: 'userAskedAbout', topic: '外地' } as const;
    expect(isConditionSatisfied(condition, { ...base, userMessages: ['孩子上周去过外地吗？'] })).toBe(true);
    expect(isConditionSatisfied(condition, { ...base, userMessages: ['今天天气不错'] })).toBe(false);
  });

  test('eventOccurred needs the exact ledger event type', () => {
    const condition = EPIDEMIC_SCENARIO_V1_DRAFT.disclosureConditions['rumor-in-group']!;
    expect(isConditionSatisfied(condition, { ...base, events: [{ type: 'user-message' }] })).toBe(false);
    expect(isConditionSatisfied(condition, { ...base, events: [{ type: 'rumor-in-group' }] })).toBe(true);
  });

  test('stateReached is at-or-past in the linear order', () => {
    // Engine capability, tested on a synthetic condition: the scenario
    // no longer binds a stateReached condition (coordination-reached was
    // vacant and removed; the engine still supports the type).
    const condition = { type: 'stateReached', state: 'coordination' } as const;
    expect(isConditionSatisfied(condition, { ...base, state: 'briefing' })).toBe(false);
    expect(isConditionSatisfied(condition, { ...base, state: 'coordination' })).toBe(true);
    expect(isConditionSatisfied(condition, { ...base, state: 'proposal' })).toBe(true);
  });
});

describe('getDisclosedFacts', () => {
  test('returns only hidden facts with satisfied conditions', () => {
    const facts = getDisclosedFacts(EPIDEMIC_SCENARIO_V1_DRAFT, {
      state: 'briefing',
      events: [{ type: 'rumor-in-group' }],
      userMessages: ['孩子上周去过外地吗？'],
    });
    expect(facts.map((f) => f.id).sort()).toEqual(['fact-rumor']);
  });

  test('a travel question alone discloses nothing', () => {
    expect(
      getDisclosedFacts(EPIDEMIC_SCENARIO_V1_DRAFT, {
        ...base,
        userMessages: ['孩子上周去过外地吗？'],
      }),
    ).toEqual([]);
  });

  test('the scenario binds only the rumor disclosure condition', () => {
    expect(Object.keys(EPIDEMIC_SCENARIO_V1_DRAFT.disclosureConditions).sort()).toEqual([
      'rumor-in-group',
    ]);
  });

  test('nothing is disclosed without triggers', () => {
    expect(getDisclosedFacts(EPIDEMIC_SCENARIO_V1_DRAFT, base)).toEqual([]);
  });
});
