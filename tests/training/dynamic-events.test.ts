import { describe, expect, test } from 'vitest';

import { checkDynamicEvents } from '@/lib/training/dynamic-events';

describe('checkDynamicEvents', () => {
  test('rumor fires at three user messages, once only', () => {
    expect(checkDynamicEvents('epi-class-fever', 2, [])).toEqual([]);
    expect(checkDynamicEvents('epi-class-fever', 3, [])).toEqual(['rumor-in-group']);
    expect(checkDynamicEvents('epi-class-fever', 5, [{ type: 'rumor-in-group' } as never])).toEqual([]);
  });

  test('unknown scenarios have no dynamic events', () => {
    expect(checkDynamicEvents('no-such-scenario', 10, [])).toEqual([]);
  });
});
