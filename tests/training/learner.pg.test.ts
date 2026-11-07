/**
 * TeacherScenarioLab — learner hall/event-center/records contract tests
 * against real PostgreSQL. Runs only when PG_CONTRACT_URL is set (same
 * convention as the other training .pg.test.ts suites); otherwise the
 * suite skips. Training tables are truncated before each test — never
 * point PG_CONTRACT_URL at a database you care about.
 */
import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import type { ScenarioVersionRecord } from '@openmaic/storage/training/pg';

import { listPublishedScenarios } from '@/lib/training/catalog';
import { listOwnEvents } from '@/lib/training/events';
import { getTrainingRecords } from '@/lib/training/records';
import { getTrainingStore } from '@/lib/training/server';

const contractUrl = process.env.PG_CONTRACT_URL;
if (contractUrl) process.env.DATABASE_URL = contractUrl;
const describePg = contractUrl ? describe : describe.skip;

function scenario(overrides: Partial<ScenarioVersionRecord> = {}): ScenarioVersionRecord {
  return {
    scenarioId: 'hall-scenario',
    version: 1,
    title: 'Hall scenario',
    setting: 'Setting',
    goal: 'Goal',
    rules: ['rule'],
    learnerRole: '小学教师',
    characters: [{ id: 'parent-1', name: '家长', role: 'parent' }],
    facts: [{ id: 'fact-1', content: 'public fact', category: 'policy', visibility: 'public' }],
    disclosureConditions: {},
    publishedAt: null,
    ...overrides,
  };
}

describePg('learner hall, events and records (PostgreSQL contract)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: contractUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await getTrainingStore();
    await pool.query('DELETE FROM training_sessions');
    await pool.query('DELETE FROM training_accounts');
    await pool.query('DELETE FROM training_snapshots');
    await pool.query('DELETE FROM training_events');
    await pool.query('DELETE FROM training_messages');
    await pool.query('DELETE FROM training_evaluations');
    await pool.query('DELETE FROM trainings');
    await pool.query('DELETE FROM training_scenarios');
  });

  test('catalog lists published only, with public fields only', async () => {
    const store = await getTrainingStore();
    await store.saveScenarioVersion(scenario({ publishedAt: 1000 }));
    await store.saveScenarioVersion(scenario({ version: 2 }));
    const published = await listPublishedScenarios();
    expect(published).toHaveLength(1);
    expect(published[0]?.scenarioId).toBe('hall-scenario');
    expect(published[0]?.version).toBe(1);
    expect('facts' in (published[0] as object)).toBe(false);
  });

  test('event center merges own trainings newest-first and filters', async () => {
    const store = await getTrainingStore();
    const owner = store.forOwner('acct:learner');
    const first = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'acct:learner',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    const second = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'acct:learner',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    await store.appendEvent({
      id: randomUUID(),
      trainingId: first.id,
      type: 'training-started',
      payload: {},
      createdAt: 1001,
    });
    await store.appendEvent({
      id: randomUUID(),
      trainingId: second.id,
      type: 'training-started',
      payload: {},
      createdAt: 1002,
    });
    await store.appendEvent({
      id: randomUUID(),
      trainingId: second.id,
      type: 'user-message',
      payload: {},
      createdAt: 1003,
    });
    const all = await listOwnEvents('acct:learner');
    expect(all.map((event) => event.createdAt)).toEqual([1003, 1002, 1001]);
    expect(all[0]?.scenarioId).toBe('s');
    expect(
      (await listOwnEvents('acct:learner', { trainingId: first.id })).map((e) => e.type),
    ).toEqual(['training-started']);
    expect(
      (await listOwnEvents('acct:learner', { type: 'user-message' })).map((e) => e.trainingId),
    ).toEqual([second.id]);
    expect(await listOwnEvents('acct:other')).toEqual([]);
  });

  test('records attach evaluations and average the five dimensions', async () => {
    const store = await getTrainingStore();
    const owner = store.forOwner('acct:learner');
    const evaluated = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'acct:learner',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'evaluation',
      now: 1000,
    });
    const plain = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'acct:learner',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'briefing',
      now: 1000,
    });
    await store.saveEvaluation({
      trainingId: evaluated.id,
      dimensions: [
        { dimension: 'communication', score: 80, evidence: [], comment: 'good' },
        { dimension: 'fact-checking', score: 60, evidence: [], comment: 'ok' },
        { dimension: 'judgment', score: 70, evidence: [], comment: 'ok' },
        { dimension: 'coordination', score: 90, evidence: [], comment: 'great' },
        { dimension: 'responsibility', score: 50, evidence: [], comment: 'weak' },
      ],
      summary: 'summary',
      suggestions: [],
      createdAt: 1001,
    });
    const { records, trend } = await getTrainingRecords('acct:learner');
    expect(records).toHaveLength(2);
    const byId = new Map(records.map((r) => [r.training.id, r]));
    expect(byId.get(evaluated.id)?.evaluation?.summary).toBe('summary');
    expect(byId.get(plain.id)?.evaluation).toBeNull();
    const trendByDim = new Map(trend.map((t) => [t.dimension, t]));
    expect(trendByDim.get('communication')).toEqual({
      dimension: 'communication',
      average: 80,
      count: 1,
    });
    expect(trendByDim.get('responsibility')?.average).toBe(50);
    expect(trend).toHaveLength(5);
  });
});
