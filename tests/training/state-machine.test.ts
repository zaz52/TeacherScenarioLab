import { describe, expect, test } from 'vitest';

import {
  canTransition,
  isTrainingState,
  nextStates,
} from '@/lib/training/state-machine';

describe('training state machine', () => {
  test('the full chain is legal in order', () => {
    const chain = [
      ['created', 'briefing'],
      ['briefing', 'fact-checking'],
      ['fact-checking', 'coordination'],
      ['coordination', 'proposal'],
      ['proposal', 'evaluation'],
      ['evaluation', 'completed'],
    ] as const;
    for (const [from, to] of chain) {
      expect(canTransition(from, to)).toBe(true);
    }
  });

  test('skipping a stage is illegal', () => {
    expect(canTransition('created', 'coordination')).toBe(false);
    expect(canTransition('briefing', 'proposal')).toBe(false);
    expect(canTransition('fact-checking', 'evaluation')).toBe(false);
  });

  test('completed is terminal', () => {
    expect(nextStates('completed')).toEqual([]);
    expect(canTransition('completed', 'created')).toBe(false);
    expect(canTransition('completed', 'briefing')).toBe(false);
  });

  test('no backward transitions', () => {
    expect(canTransition('coordination', 'fact-checking')).toBe(false);
    expect(canTransition('evaluation', 'proposal')).toBe(false);
  });

  test('isTrainingState guards unknown values', () => {
    expect(isTrainingState('briefing')).toBe(true);
    expect(isTrainingState('graduated')).toBe(false);
    expect(isTrainingState(null)).toBe(false);
    expect(isTrainingState(42)).toBe(false);
  });
});
