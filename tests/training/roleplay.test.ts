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
    expect(system).not.toContain('校医兼任学校疫情报告人');
    expect(system).not.toContain('学校瞒报');
    expect(system).not.toContain('去过外地');
  });

  test('includes rules and the conversation transcript', () => {
    expect(system).toContain('不擅自宣布停课或复课');
    expect(prompt).toContain('教师：家长您好，我是班主任');
    expect(prompt).toContain('乐乐妈妈');
  });
});

describe('buildCharacterPrompt per-role trimming', () => {
  const parent = getCharacterPack('epi-class-fever', 'parent-1')!;
  const history = [
    {
      id: 'u1',
      trainingId: 't1',
      characterId: null,
      role: 'user',
      content: '家长您好',
      idempotencyKey: null,
      createdAt: 1,
      supersededBy: null,
    },
    {
      id: 'c1',
      trainingId: 't1',
      characterId: 'parent-1',
      role: 'character',
      content: '家长自己的上一句',
      idempotencyKey: null,
      createdAt: 2,
      supersededBy: null,
    },
    {
      id: 'c2',
      trainingId: 't1',
      characterId: 'principal-1',
      role: 'character',
      content: '校长的上一句，其他角色不应看见',
      idempotencyKey: null,
      createdAt: 3,
      supersededBy: null,
    },
  ];
  const { prompt } = buildCharacterPrompt(EPIDEMIC_SCENARIO_V1_DRAFT, parent, '乐乐妈妈', history);

  test('keeps teacher messages and the speaker’s own replies only', () => {
    expect(prompt).toContain('教师：家长您好');
    expect(prompt).toContain('乐乐妈妈：家长自己的上一句');
    expect(prompt).not.toContain('校长的上一句，其他角色不应看见');
  });

  test('caps the transcript at the most recent messages', () => {
    const longHistory = Array.from({ length: 35 }, (_, i) => ({
      id: `u${i}`,
      trainingId: 't1',
      characterId: null,
      role: 'user',
      content: `msg-${i}`,
      idempotencyKey: null,
      createdAt: i,
      supersededBy: null,
    }));
    const { prompt: longPrompt } = buildCharacterPrompt(
      EPIDEMIC_SCENARIO_V1_DRAFT,
      parent,
      '乐乐妈妈',
      longHistory,
    );
    expect(longPrompt).not.toContain('msg-0');
    expect(longPrompt).toContain('msg-34');
  });
});

describe('getCharacterPack', () => {
  test('returns packs for all epidemic characters; unknown ones have none', () => {
    expect(getCharacterPack('epi-class-fever', 'parent-1')?.characterId).toBe('parent-1');
    expect(getCharacterPack('epi-class-fever', 'student-1')?.characterId).toBe('student-1');
    expect(getCharacterPack('epi-class-fever', 'teacher-1')?.characterId).toBe('teacher-1');
    expect(getCharacterPack('epi-class-fever', 'doctor-1')?.characterId).toBe('doctor-1');
    expect(getCharacterPack('epi-class-fever', 'principal-1')?.characterId).toBe(
      'principal-1',
    );
    expect(getCharacterPack('epi-class-fever', 'no-such-character')).toBeUndefined();
    expect(getCharacterPack('no-such-scenario', 'parent-1')).toBeUndefined();
  });
});
