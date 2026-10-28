import { describe, expect, test } from 'vitest';

import type { TrainingMessageRecord } from '@openmaic/storage/training/pg';

import { selectResponder } from '@/lib/training/director';
import { EPIDEMIC_SCENARIO_V1_DRAFT } from '@/lib/training/scenarios/epidemic-v1';

const ALL = ['student-1', 'parent-1', 'teacher-1', 'doctor-1', 'principal-1'];

function message(
  overrides: Partial<TrainingMessageRecord> & { role: string },
): TrainingMessageRecord {
  return {
    id: 'm',
    trainingId: 't',
    characterId: null,
    content: '',
    idempotencyKey: null,
    createdAt: 1,
    supersededBy: null,
    ...overrides,
  } as TrainingMessageRecord;
}

describe('selectResponder', () => {
  test('explicit mention beats topic keywords', () => {
    const pick = selectResponder(EPIDEMIC_SCENARIO_V1_DRAFT, ALL, [], '校医，登记的事怎么样了？');
    expect(pick?.characterId).toBe('doctor-1');
    expect(pick?.reason).toContain('点名');
  });

  test('topic keywords map to the right character', () => {
    expect(
      selectResponder(EPIDEMIC_SCENARIO_V1_DRAFT, ALL, [], '停课的事到底谁说了算？')
        ?.characterId,
    ).toBe('principal-1');
    expect(
      selectResponder(EPIDEMIC_SCENARIO_V1_DRAFT, ALL, [], '乐乐昨晚烧得厉害，怎么办？')
        ?.characterId,
    ).toBe('parent-1');
    expect(
      selectResponder(EPIDEMIC_SCENARIO_V1_DRAFT, ALL, [], '晨检和消毒今天做了吗？')
        ?.characterId,
    ).toBe('doctor-1');
    expect(
      selectResponder(EPIDEMIC_SCENARIO_V1_DRAFT, ALL, [], '隔壁班情况怎么样？')
        ?.characterId,
    ).toBe('teacher-1');
    expect(
      selectResponder(EPIDEMIC_SCENARIO_V1_DRAFT, ALL, [], '我有点咳嗽，怕被笑话')
        ?.characterId,
    ).toBe('student-1');
  });

  test('rotation picks the least-recently-spoken eligible character', () => {
    const history = [
      message({ role: 'user', content: '大家好' }),
      message({ role: 'character', characterId: 'parent-1', content: '家长回复' }),
      message({ role: 'character', characterId: 'doctor-1', content: '校医回复' }),
    ];
    const pick = selectResponder(EPIDEMIC_SCENARIO_V1_DRAFT, ALL, history, '嗯');
    // student-1, teacher-1, principal-1 never spoke; scenario order wins.
    expect(pick?.characterId).toBe('student-1');
    expect(pick?.reason).toContain('轮换');
  });

  test('no eligible characters returns null', () => {
    expect(selectResponder(EPIDEMIC_SCENARIO_V1_DRAFT, [], [], '你好')).toBeNull();
  });

  test('ineligible characters are never picked, even when mentioned', () => {
    const pick = selectResponder(
      EPIDEMIC_SCENARIO_V1_DRAFT,
      ['parent-1'],
      [],
      '校长，停课的事怎么定？',
    );
    expect(pick?.characterId).toBe('parent-1');
  });
});
