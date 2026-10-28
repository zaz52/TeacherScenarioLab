import { describe, expect, test } from 'vitest';

import { getCharacterPack } from '@/lib/training/character-packs';
import { buildCharacterPrompt } from '@/lib/training/roleplay';
import { EPIDEMIC_SCENARIO_V1_DRAFT } from '@/lib/training/scenarios/epidemic-v1';

const parentPack = getCharacterPack('epi-class-fever', 'parent-1')!;

describe('buildCharacterPrompt information boundary', () => {
  const { system, prompt } = buildCharacterPrompt(
    EPIDEMIC_SCENARIO_V1_DRAFT,
    parentPack,
    '乐乐妈妈',
    [
      {
        id: 'm1',
        trainingId: 't1',
        characterId: null,
        role: 'user',
        content: '家长您好，我是班主任',
        idempotencyKey: null,
        createdAt: 1,
        supersededBy: null,
      },
    ],
  );

  test('admits public facts and the speaker’s own private facts', () => {
    expect(system).toContain('学校每天执行晨检');
    expect(system).toContain('乐乐昨晚发烧 39 度');
  });

  test('excludes other characters’ private facts and hidden facts', () => {
    expect(system).not.toContain('小雨今早有点咳嗽');
    expect(system).not.toContain('隔壁班也有 2 名学生请假');
    expect(system).not.toContain('校医已把请假登记情况报给学校负责人');
    expect(system).not.toContain('学校瞒报');
    expect(system).not.toContain('去过外地');
  });

  test('includes rules and the conversation transcript', () => {
    expect(system).toContain('不擅自宣布停课或复课');
    expect(prompt).toContain('教师：家长您好，我是班主任');
    expect(prompt).toContain('乐乐妈妈');
  });
});

describe('getCharacterPack', () => {
  test('returns the parent pack; unknown characters have no pack', () => {
    expect(getCharacterPack('epi-class-fever', 'parent-1')?.characterId).toBe('parent-1');
    expect(getCharacterPack('epi-class-fever', 'student-1')).toBeUndefined();
    expect(getCharacterPack('no-such-scenario', 'parent-1')).toBeUndefined();
  });
});
