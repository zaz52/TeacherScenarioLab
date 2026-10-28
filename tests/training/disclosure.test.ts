import { describe, expect, test } from 'vitest';

import { getDisclosedFacts, isConditionSatisfied } from '@/lib/training/disclosure';
import { EPIDEMIC_SCENARIO_V1_DRAFT } from '@/lib/training/scenarios/epidemic-v1';

const base = { state: 'briefing', events: [], userMessages: [] as string[] };

describe('isConditionSatisfied', () => {
  test('userAskedAbout matches topic keywords, not unrelated messages', () => {
    const condition = EPIDEMIC_SCENARIO_V1_DRAFT.disclosureConditions['ask-travel']!;
    expect(isConditionSatisfied(condition, { ...base, userMessages: ['孩子上周去过外地吗？'] })).toBe(true);
    expect(isConditionSatisfied(condition, { ...base, userMessages: ['今天天气不错'] })).toBe(false);
  });

  test('eventOccurred needs the exact ledger event type', () => {
    const condition = EPIDEMIC_SCENARIO_V1_DRAFT.disclosureConditions['rumor-in-group']!;
    expect(isConditionSatisfied(condition, { ...base, events: [{ type: 'user-message' }] })).toBe(false);
    expect(isConditionSatisfied(condition, { ...base, events: [{ type: 'rumor-in-group' }] })).toBe(true);
  });

  test('stateReached is at-or-past in the linear order', () => {
    const condition =
      EPIDEMIC_SCENARIO_V1_DRAFT.disclosureConditions['coordination-reached']!;
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
    expect(facts.map((f) => f.id).sort()).toEqual(['fact-rumor', 'fact-travel']);
  });

  test('nothing is disclosed without triggers', () => {
    expect(getDisclosedFacts(EPIDEMIC_SCENARIO_V1_DRAFT, base)).toEqual([]);
  });
});
