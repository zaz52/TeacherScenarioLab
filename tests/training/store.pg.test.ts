/**
 * TeacherScenarioLab — training service contract tests against real
 * PostgreSQL. Runs only when PG_CONTRACT_URL is set (same convention as
 * the storage .pg.test.ts suites); otherwise the suite skips. The service
 * reads DATABASE_URL at call time, so the test points it at the contract
 * database; training tables are truncated before each test — never point
 * PG_CONTRACT_URL at a database you care about.
 */
import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import type { ScenarioVersionRecord } from '@openmaic/storage/training/pg';

import { getTrainingStore } from '@/lib/training/server';
import {
  appendUserMessage,
  createTraining,
  getTraining,
  listEvents,
  listMessages,
  listTrainings,
  startTraining,
  TrainingServiceError,
} from '@/lib/training/store';

const contractUrl = process.env.PG_CONTRACT_URL;
if (contractUrl) process.env.DATABASE_URL = contractUrl;
const describePg = contractUrl ? describe : describe.skip;

function scenario(overrides: Partial<ScenarioVersionRecord> = {}): ScenarioVersionRecord {
  return {
    scenarioId: 'test-scenario',
    version: 1,
    title: 'Test scenario',
    setting: 'Test setting',
    goal: 'Test goal',
    rules: ['rule 1'],
    learnerRole: '小学教师',
    characters: [{ id: 'parent-1', name: '家长', role: 'parent' }],
    facts: [
      { id: 'fact-1', content: 'public fact', category: 'policy', visibility: 'public' },
    ],
    disclosureConditions: {},
    publishedAt: 1000,
    ...overrides,
  };
}

describePg('training service (PostgreSQL contract)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: contractUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    // First call ensures the training schema in the fresh worker database;
    // truncates must run after that, not before.
    const store = await getTrainingStore();
    await pool.query('DELETE FROM training_snapshots');
    await pool.query('DELETE FROM training_events');
    await pool.query('DELETE FROM training_messages');
    await pool.query('DELETE FROM trainings');
    await pool.query('DELETE FROM training_scenarios');
    await store.saveScenarioVersion(scenario());
    await store.saveScenarioVersion(scenario({ version: 2, publishedAt: null }));
  });

  test('create pins a published version and ledgers training-created', async () => {
    const training = await createTraining('owner-1', {
      scenarioId: 'test-scenario',
      scenarioVersion: 1,
    });
    expect(training.state).toBe('created');
    expect(training.scenarioVersion).toBe(1);
    const events = await listEvents('owner-1', training.id);
    expect(events.map((e) => e.type)).toEqual(['training-created']);
    expect(events[0]?.payload).toEqual({ scenarioId: 'test-scenario', scenarioVersion: 1 });
  });

  test('create refuses missing and draft scenarios', async () => {
    await expect(
      createTraining('owner-1', { scenarioId: 'nope', scenarioVersion: 1 }),
    ).rejects.toMatchObject({ status: 404, code: 'SCENARIO_NOT_FOUND' });
    await expect(
      createTraining('owner-1', { scenarioId: 'test-scenario', scenarioVersion: 2 }),
    ).rejects.toMatchObject({ status: 400, code: 'INVALID_REQUEST' });
    await expect(
      createTraining('owner-1', { scenarioId: 'test-scenario', scenarioVersion: 0 }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('start moves created to briefing; a second start conflicts', async () => {
    const training = await createTraining('owner-1', {
      scenarioId: 'test-scenario',
      scenarioVersion: 1,
    });
    const started = await startTraining('owner-1', training.id);
    expect(started.state).toBe('briefing');
    expect((await listEvents('owner-1', training.id)).map((e) => e.type)).toEqual([
      'training-created',
      'training-started',
    ]);
    await expect(startTraining('owner-1', training.id)).rejects.toMatchObject({
      status: 409,
      code: 'TRAINING_STATE_CONFLICT',
    });
  });

  test('messages need a started training; idempotency dedupes', async () => {
    const training = await createTraining('owner-1', {
      scenarioId: 'test-scenario',
      scenarioVersion: 1,
    });
    await expect(
      appendUserMessage('owner-1', training.id, { content: 'hello' }),
    ).rejects.toMatchObject({ status: 409 });
    await startTraining('owner-1', training.id);
    const key = randomUUID();
    const first = await appendUserMessage('owner-1', training.id, {
      content: 'hello',
      idempotencyKey: key,
    });
    const second = await appendUserMessage('owner-1', training.id, {
      content: 'hello',
      idempotencyKey: key,
    });
    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);
    expect(second.message.id).toBe(first.message.id);
    expect(await listMessages('owner-1', training.id, false)).toHaveLength(1);
    expect(
      (await listEvents('owner-1', training.id)).filter((e) => e.type === 'user-message'),
    ).toHaveLength(1);
  });

  test('message validation: empty content and bad keys are 400', async () => {
    const training = await createTraining('owner-1', {
      scenarioId: 'test-scenario',
      scenarioVersion: 1,
    });
    await startTraining('owner-1', training.id);
    await expect(
      appendUserMessage('owner-1', training.id, { content: '   ' }),
    ).rejects.toMatchObject({ status: 400 });
    await expect(
      appendUserMessage('owner-1', training.id, {
        content: 'hi',
        idempotencyKey: 'not-a-uuid',
      }),
    ).rejects.toMatchObject({ status: 400 });
  });

  test('owner scoping: foreign trainings are invisible', async () => {
    const training = await createTraining('owner-a', {
      scenarioId: 'test-scenario',
      scenarioVersion: 1,
    });
    expect(await getTraining('owner-b', training.id)).toBeNull();
    expect(await listTrainings('owner-b')).toEqual([]);
    await expect(listMessages('owner-b', training.id, false)).rejects.toBeInstanceOf(
      TrainingServiceError,
    );
    await expect(listEvents('owner-b', training.id)).rejects.toMatchObject({
      status: 404,
    });
  });
});
