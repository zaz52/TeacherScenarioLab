import { describe, expect, test } from 'vitest';

import { checkDynamicEvents } from '@/lib/training/dynamic-events';

describe('checkDynamicEvents', () => {
  test('rumor fires at three user messages, once only', () => {
    expect(checkDynamicEvents('epi-class-fever', 2, [])).toEqual([]);
    expect(checkDynamicEvents('epi-class-fever', 3, [])).toEqual(['rumor-in-group']);
    expect(checkDynamicEvents('epi-class-fever', 5, [{ type: 'rumor-in-group' } as never])).toEqual([]);
  });

  test('rumor is suppressed when the teacher already explained it', () => {
    expect(
      checkDynamicEvents('epi-class-fever', 3, [], [
        '家长群那个瞒报的说法我已经核实澄清过了，以学校通知为准',
      ]),
    ).toEqual([]);
  });

  test('rumor still fires when the teacher only mentioned it or promised to verify', () => {
    expect(checkDynamicEvents('epi-class-fever', 3, [], ['家长群在传瞒报的事'])).toEqual([
      'rumor-in-group',
    ]);
    expect(
      checkDynamicEvents('epi-class-fever', 3, [], ['家长群在传瞒报的事，我去核实一下']),
    ).toEqual(['rumor-in-group']);
  });

  test('unknown scenarios have no dynamic events', () => {
    expect(checkDynamicEvents('no-such-scenario', 10, [])).toEqual([]);
  });
});
