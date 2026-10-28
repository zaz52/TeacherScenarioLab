import { describe, expect, test } from 'vitest';

import {
  isPublishedScenario,
  validateScenarioVersion,
  type ScenarioVersion,
} from '@/lib/training/scenario';
import { validateFactPack } from '@/lib/training/characters';

function baseVersion(): ScenarioVersion {
  return {
    scenarioId: 'epi-school-closure',
    version: 1,
    title: '疫情应急：班级停课处置',
    setting: '小学三年级因疫情需临时停课，教师协调各方。',
    goal: '核实事实、协调资源、提出处置方案',
    rules: ['不编造事实'],
    learnerRole: '小学教师',
    characters: [
      { id: 'student-1', name: '小明', role: 'student' },
      { id: 'parent-1', name: '小明妈妈', role: 'parent' },
    ],
    facts: [
      {
        id: 'fact-public-1',
        content: '班级已有 3 名学生发热请假。',
        category: 'student',
        visibility: 'public',
      },
      {
        id: 'fact-private-1',
        content: '小明妈妈今晚要值夜班，无法居家看护。',
        category: 'parent',
        visibility: 'character-private',
        ownerCharacterId: 'parent-1',
      },
    ],
    disclosureConditions: {},
    publishedAt: null,
  };
}

describe('validateScenarioVersion', () => {
  test('a well-formed draft version passes', () => {
    expect(validateScenarioVersion(baseVersion())).toEqual([]);
    expect(isPublishedScenario(baseVersion())).toBe(false);
    expect(isPublishedScenario({ ...baseVersion(), publishedAt: 1 })).toBe(true);
  });

  test('duplicate fact ids are rejected', () => {
    const version = baseVersion();
    version.facts.push({ ...version.facts[0] });
    const problems = validateScenarioVersion(version);
    expect(problems.some((p) => p.includes('duplicate fact id'))).toBe(true);
  });

  test('a private fact without an owner is rejected', () => {
    const version = baseVersion();
    version.facts[1] = { ...version.facts[1], ownerCharacterId: undefined };
    const problems = validateScenarioVersion(version);
    expect(problems.some((p) => p.includes('no ownerCharacterId'))).toBe(true);
  });

  test('a private fact owned by a stranger is rejected', () => {
    const version = baseVersion();
    version.facts[1] = { ...version.facts[1], ownerCharacterId: 'ghost' };
    const problems = validateScenarioVersion(version);
    expect(problems.some((p) => p.includes('is not a character'))).toBe(true);
  });

  test('a hidden fact with an undeclared condition is rejected', () => {
    const version = baseVersion();
    version.facts.push({
      id: 'fact-hidden-1',
      content: '学校备用教室钥匙在门卫处。',
      category: 'resource',
      visibility: 'hidden',
      disclosureConditionId: 'cond-missing',
    });
    const problems = validateScenarioVersion(version);
    expect(problems.some((p) => p.includes('is not declared'))).toBe(true);
  });

  test('empty title, setting and learnerRole are rejected', () => {
    const version = { ...baseVersion(), title: '', setting: '', learnerRole: '' };
    const problems = validateScenarioVersion(version);
    expect(problems).toContain('title is empty');
    expect(problems).toContain('setting is empty');
    expect(problems).toContain('learnerRole is empty');
  });
});

describe('validateFactPack', () => {
  test('a pack matching the fact table passes', () => {
    const version = baseVersion();
    expect(
      validateFactPack(
        {
          characterId: 'parent-1',
          background: '小明妈妈，在医院工作。',
          emotionBaseline: '焦虑但配合',
          communicationStyle: '简短、直接',
          privateFactIds: ['fact-private-1'],
          publicFactIds: ['fact-public-1'],
        },
        version.facts,
      ),
    ).toEqual([]);
  });

  test('a pack claiming another character’s private fact is rejected', () => {
    const version = baseVersion();
    const problems = validateFactPack(
      {
        characterId: 'student-1',
        background: '小明',
        emotionBaseline: '平静',
        communicationStyle: '简短',
        privateFactIds: ['fact-private-1'],
        publicFactIds: [],
      },
      version.facts,
    );
    expect(problems.some((p) => p.includes('is not owned by student-1'))).toBe(true);
  });

  test('a fact listed as both private and public is rejected', () => {
    const version = baseVersion();
    const problems = validateFactPack(
      {
        characterId: 'parent-1',
        background: '小明妈妈',
        emotionBaseline: '焦虑',
        communicationStyle: '简短',
        privateFactIds: ['fact-private-1'],
        publicFactIds: ['fact-private-1'],
      },
      version.facts,
    );
    expect(problems.some((p) => p.includes('both private and public'))).toBe(true);
  });
});
