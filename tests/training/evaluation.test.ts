import { describe, expect, test } from 'vitest';

import type { TrainingMessageRecord } from '@openmaic/storage/training/pg';

import {
  buildEvaluationPrompt,
  parseEvaluation,
  verifyEvaluationCitations,
  type TrainingEvaluation,
} from '@/lib/training/evaluation';
import { EPIDEMIC_SCENARIO_V1_DRAFT } from '@/lib/training/scenarios/epidemic-v1';

function validJson(overrides: Record<string, unknown> = {}): string {
  const dimensions = [
    { dimension: 'communication', score: 80, evidence: ['u1'], comment: '好' },
    { dimension: 'fact-checking', score: 70, evidence: ['u1'], comment: '好' },
    { dimension: 'judgment', score: 75, evidence: [], comment: '好' },
    { dimension: 'coordination', score: 85, evidence: ['u2'], comment: '好' },
    { dimension: 'responsibility', score: 90, evidence: [], comment: '好' },
  ];
  return `简短评语。\n\`\`\`json\n${JSON.stringify({
    dimensions,
    summary: '总体不错。',
    suggestions: ['多问一句。'],
    ...overrides,
  })}\n\`\`\``;
}

function message(id: string, role: string): TrainingMessageRecord {
  return {
    id,
    trainingId: 't1',
    characterId: null,
    role,
    content: '内容',
    idempotencyKey: null,
    createdAt: 1,
    supersededBy: null,
  } as TrainingMessageRecord;
}

describe('parseEvaluation', () => {
  test.each(['请核对符号 } 的含义。', '保留 { 作为原始证据。', '引文包含 "引号" 与 \\ 转义。'])(
    'preserves valid JSON string content: %s',
    (summary) => {
      expect(parseEvaluation('t1', validJson({ summary }), 1)?.summary).toBe(summary);
    },
  );

  test('parses a narrative plus JSON tail', () => {
    const parsed = parseEvaluation('t1', validJson(), 123);
    expect(parsed?.trainingId).toBe('t1');
    expect(parsed?.dimensions).toHaveLength(5);
    expect(parsed?.summary).toBe('总体不错。');
    expect(parsed?.createdAt).toBe(123);
  });

  test('rejects missing dimensions, bad scores, and garbage', () => {
    expect(parseEvaluation('t1', validJson({ dimensions: [] }), 1)).toBeNull();
    expect(
      parseEvaluation(
        't1',
        validJson({
          dimensions: [
            { dimension: 'communication', score: 101, evidence: [], comment: '' },
            { dimension: 'fact-checking', score: 70, evidence: [], comment: '' },
            { dimension: 'judgment', score: 70, evidence: [], comment: '' },
            { dimension: 'coordination', score: 70, evidence: [], comment: '' },
            { dimension: 'responsibility', score: 70, evidence: [], comment: '' },
          ],
        }),
        1,
      ),
    ).toBeNull();
    expect(parseEvaluation('t1', '没有 JSON 的纯文本', 1)).toBeNull();
  });
});

describe('verifyEvaluationCitations', () => {
  const transcript = [message('u1', 'user'), message('u2', 'user'), message('c1', 'character')];
  const base = parseEvaluation('t1', validJson(), 1)!;

  test('accepts teacher-message evidence', () => {
    expect(verifyEvaluationCitations(base, transcript)).toEqual([]);
  });

  test('flags unknown ids and character messages', () => {
    const bad: TrainingEvaluation = {
      ...base,
      dimensions: base.dimensions.map((d) =>
        d.dimension === 'communication' ? { ...d, evidence: ['no-such', 'c1'] } : d,
      ),
    };
    const problems = verifyEvaluationCitations(bad, transcript);
    expect(problems).toHaveLength(2);
    expect(problems[0]).toContain('unknown evidence id no-such');
    expect(problems[1]).toContain('not a teacher message');
  });
});

describe('buildEvaluationPrompt privacy assessment', () => {
  test('the prompt tells the evaluator to score peer-privacy handling', () => {
    const { system } = buildEvaluationPrompt(EPIDEMIC_SCENARIO_V1_DRAFT, []);
    expect(system).toContain('同桌');
    expect(system).toContain('健康隐私');
    expect(system).toContain('responsibility');
  });
});
