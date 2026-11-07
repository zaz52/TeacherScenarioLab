/**
 * TeacherScenarioLab — evaluation service contract tests against real
 * PostgreSQL. Same harness convention as the other training .pg.test.ts
 * suites: runs only when PG_CONTRACT_URL is set; the service reads
 * DATABASE_URL at call time.
 */
import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import type { ScenarioVersionRecord } from '@openmaic/storage/training/pg';

import { generateEvaluation, getEvaluation } from '@/lib/training/evaluation';
import { getTrainingStore } from '@/lib/training/server';
import {
  appendUserMessage,
  createTraining,
  listMessages,
  listEvents,
  startTraining,
  transitionTraining,
} from '@/lib/training/store';

const contractUrl = process.env.PG_CONTRACT_URL;
if (contractUrl) process.env.DATABASE_URL = contractUrl;
const describePg = contractUrl ? describe : describe.skip;

function evaluationJson(userId: string): string {
  const dimensions = [
    { dimension: 'communication', score: 80, evidence: [userId], comment: '先安抚再讲事实。' },
    { dimension: 'fact-checking', score: 70, evidence: [userId], comment: '多问了一句。' },
    { dimension: 'judgment', score: 75, evidence: [], comment: '未擅自下结论。' },
    { dimension: 'coordination', score: 85, evidence: [], comment: '口径一致。' },
    { dimension: 'responsibility', score: 90, evidence: [], comment: '未透露隐私。' },
  ];
  return `总体表现稳健。\n\`\`\`json\n${JSON.stringify({
    dimensions,
    summary: '总体稳健。',
    suggestions: ['下次早点问校医。'],
  })}\n\`\`\``;
}

describePg('training evaluation (PostgreSQL contract)', () => {
  let pool: Pool;
  let trainingId: string;
  let userMessageId: string;

  beforeAll(async () => {
    pool = new Pool({ connectionString: contractUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    const store = await getTrainingStore();
    await pool.query('DELETE FROM training_evaluations');
    await pool.query('DELETE FROM training_snapshots');
    await pool.query('DELETE FROM training_events');
    await pool.query('DELETE FROM training_messages');
    await pool.query('DELETE FROM trainings');
    await pool.query('DELETE FROM training_scenarios');
    await store.saveScenarioVersion({
      scenarioId: 'epi-class-fever',
      version: 1,
      title: '班级出现多名学生发热：第一天的沟通',
      setting: '冬春流感高发季',
      goal: '核实事实、安抚家长、对齐口径',
      rules: ['不编造诊断'],
      learnerRole: '小学教师',
      characters: [{ id: 'parent-1', name: '乐乐妈妈', role: 'parent' }],
      facts: [],
      disclosureConditions: {},
      publishedAt: 1000,
    });
    const training = await createTraining('owner-1', {
      scenarioId: 'epi-class-fever',
      scenarioVersion: 1,
    });
    trainingId = training.id;
    await startTraining('owner-1', trainingId);
    const message = await appendUserMessage('owner-1', trainingId, {
      content: '家长您好，我是班主任',
    });
    userMessageId = message.message.id;
    await transitionTraining('owner-1', trainingId, 'fact-checking');
    await transitionTraining('owner-1', trainingId, 'coordination');
    await transitionTraining('owner-1', trainingId, 'proposal');
    await transitionTraining('owner-1', trainingId, 'evaluation');
  });

  test('evaluates with an injected generator and persists the result', async () => {
    const evaluation = await generateEvaluation('owner-1', trainingId, {
      generateModelEvaluation: async () => evaluationJson(userMessageId),
    });
    expect(evaluation.dimensions).toHaveLength(5);
    expect(evaluation.summary).toBe('总体稳健。');
    const stored = await getEvaluation('owner-1', trainingId);
    expect(stored?.dimensions[0]).toMatchObject({ dimension: 'communication', score: 80 });
    const messages = await listMessages('owner-1', trainingId, false);
    expect(messages).toHaveLength(1);
    await expect(getEvaluation('owner-2', trainingId)).rejects.toMatchObject({ status: 404 });
  });

  test('unparsable output and bad citations persist nothing', async () => {
    await expect(
      generateEvaluation('owner-1', trainingId, {
        generateModelEvaluation: async () => '纯文本，无 JSON。',
      }),
    ).rejects.toMatchObject({ status: 502 });
    await expect(
      generateEvaluation('owner-1', trainingId, {
        generateModelEvaluation: async () => evaluationJson('no-such-message'),
      }),
    ).rejects.toMatchObject({ status: 502 });
    expect(await getEvaluation('owner-1', trainingId)).toBeNull();
  });

  test('upstream failures disclose no provider detail and persist no evaluation', async () => {
    await expect(
      generateEvaluation('owner-1', trainingId, {
        generateModelEvaluation: async () => {
          throw new Error('sensitive-upstream-detail');
        },
      }),
    ).rejects.toMatchObject({ status: 503, message: 'evaluation model is not available' });
    expect(await getEvaluation('owner-1', trainingId)).toBeNull();
    expect(
      (await listEvents('owner-1', trainingId)).filter((e) => e.type === 'evaluation-completed'),
    ).toHaveLength(0);
  });

  test('wrong states fail with 409', async () => {
    const training = await createTraining('owner-1', {
      scenarioId: 'epi-class-fever',
      scenarioVersion: 1,
    });
    await expect(
      generateEvaluation('owner-1', training.id, {
        generateModelEvaluation: async () => evaluationJson(userMessageId),
      }),
    ).rejects.toMatchObject({ status: 409 });
  });
});
