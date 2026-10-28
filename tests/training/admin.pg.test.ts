/**
 * TeacherScenarioLab — admin service contract tests against real
 * PostgreSQL. Runs only when PG_CONTRACT_URL is set (same convention as
 * the other training .pg.test.ts suites); otherwise the suite skips.
 * Training tables are truncated before each test — never point
 * PG_CONTRACT_URL at a database you care about.
 */
import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import type { ScenarioVersionRecord } from '@openmaic/storage/training/pg';

import {
  getScenarioForAdmin,
  getTrainingForAdmin,
  importCodeScenarioDraft,
  listAllScenarios,
  listAllTrainings,
  publishScenarioVersion,
} from '@/lib/training/admin';
import { getTrainingStore } from '@/lib/training/server';
import { TrainingServiceError } from '@/lib/training/store';

const contractUrl = process.env.PG_CONTRACT_URL;
if (contractUrl) process.env.DATABASE_URL = contractUrl;
const describePg = contractUrl ? describe : describe.skip;

function scenario(overrides: Partial<ScenarioVersionRecord> = {}): ScenarioVersionRecord {
  return {
    scenarioId: 'admin-test-scenario',
    version: 1,
    title: 'Admin test scenario',
    setting: 'Test setting',
    goal: 'Test goal',
    rules: ['rule 1'],
    learnerRole: '小学教师',
    characters: [{ id: 'parent-1', name: '家长', role: 'parent' }],
    facts: [
      { id: 'fact-1', content: 'public fact', category: 'policy', visibility: 'public' },
    ],
    disclosureConditions: {},
    publishedAt: null,
    ...overrides,
  };
}

describePg('training admin service (PostgreSQL contract)', () => {
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

  test('publish freezes a draft; republishing and missing are errors', async () => {
    const store = await getTrainingStore();
    await store.saveScenarioVersion(scenario());
    const published = await publishScenarioVersion('admin-test-scenario', 1);
    expect(published.publishedAt).not.toBeNull();
    expect(published.title).toBe('Admin test scenario');
    await expect(publishScenarioVersion('admin-test-scenario', 1)).rejects.toMatchObject({
      status: 409,
      code: 'TRAINING_STATE_CONFLICT',
    });
    await expect(publishScenarioVersion('admin-test-scenario', 99)).rejects.toMatchObject({
      status: 404,
      code: 'SCENARIO_NOT_FOUND',
    });
  });

  test('import brings a code draft in as a draft; re-import conflicts', async () => {
    const imported = await importCodeScenarioDraft('epi-class-fever');
    expect(imported.scenarioId).toBe('epi-class-fever');
    expect(imported.publishedAt).toBeNull();
    expect(imported.facts.length).toBeGreaterThan(0);
    await expect(importCodeScenarioDraft('epi-class-fever')).rejects.toMatchObject({
      status: 409,
    });
    await expect(importCodeScenarioDraft('no-such-scenario')).rejects.toMatchObject({
      status: 404,
      code: 'SCENARIO_NOT_FOUND',
    });
    const listed = await listAllScenarios();
    expect(listed.map((row) => row.scenarioId)).toContain('epi-class-fever');
    const detail = await getScenarioForAdmin('epi-class-fever', 1);
    expect(detail.facts.length).toBeGreaterThan(0);
  });

  test('admin training list crosses owners and filters; detail carries the ledger', async () => {
    const store = await getTrainingStore();
    const a = await store.forOwner('acct:a').createTraining({
      id: randomUUID(),
      ownerId: 'acct:a',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    const b = await store.forOwner('acct:b').createTraining({
      id: randomUUID(),
      ownerId: 'acct:b',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'briefing',
      now: 1000,
    });
    const all = await listAllTrainings();
    expect(all.map((row) => row.id).sort()).toEqual([a.id, b.id].sort());
    expect((await listAllTrainings({ ownerId: 'acct:b' })).map((row) => row.id)).toHaveLength(1);
    expect((await listAllTrainings({ state: 'created' })).map((row) => row.id)).toEqual([a.id]);
    await store.appendMessage({
      id: randomUUID(),
      trainingId: a.id,
      characterId: null,
      role: 'user',
      content: 'hello',
      idempotencyKey: null,
      createdAt: 1001,
    });
    await store.appendEvent({
      id: randomUUID(),
      trainingId: a.id,
      type: 'training-started',
      payload: {},
      createdAt: 1002,
    });
    const detail = await getTrainingForAdmin(a.id);
    expect(detail.training.id).toBe(a.id);
    expect(detail.messages.map((row) => row.content)).toEqual(['hello']);
    expect(detail.events.map((row) => row.type)).toEqual(['training-started']);
    expect(detail.evaluation).toBeNull();
    await expect(getTrainingForAdmin('missing')).rejects.toMatchObject({
      status: 404,
      code: 'TRAINING_NOT_FOUND',
    });
  });
});
