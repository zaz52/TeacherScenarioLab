/**
 * TeacherScenarioLab — account service contract tests against real
 * PostgreSQL. Runs only when PG_CONTRACT_URL is set (same convention as
 * the other training .pg.test.ts suites); otherwise the suite skips.
 * The service reads DATABASE_URL at call time, so the test points it at
 * the contract database; training tables are truncated before each test —
 * never point PG_CONTRACT_URL at a database you care about.
 */
import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import { getTrainingStore } from '@/lib/training/server';
import {
  claimAnonymousTrainings,
  createTrainingAccount,
  deleteTrainingSession,
} from '@/lib/training/accounts';
import { hashTrainingSessionToken } from '@/lib/training/session-auth';
import { TrainingServiceError } from '@/lib/training/store';

const contractUrl = process.env.PG_CONTRACT_URL;
if (contractUrl) process.env.DATABASE_URL = contractUrl;
const describePg = contractUrl ? describe : describe.skip;

describePg('training accounts (PostgreSQL contract)', () => {
  let pool: Pool;

  beforeAll(async () => {
    pool = new Pool({ connectionString: contractUrl });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    const store = await getTrainingStore();
    await pool.query('DELETE FROM training_sessions');
    await pool.query('DELETE FROM training_accounts');
    await pool.query('DELETE FROM training_snapshots');
    await pool.query('DELETE FROM training_events');
    await pool.query('DELETE FROM training_messages');
    await pool.query('DELETE FROM training_evaluations');
    await pool.query('DELETE FROM trainings');
  });

  test('creating an account stores only the session hash', async () => {
    const { account, token, expiresAt } = await createTrainingAccount('小宋');
    expect(account.accountId.startsWith('acct:')).toBe(true);
    expect(account.displayName).toBe('小宋');
    expect(expiresAt).toBeGreaterThan(Date.now());
    const store = await getTrainingStore();
    const found = await store.getSessionByTokenHash(hashTrainingSessionToken(token));
    expect(found?.account.accountId).toBe(account.accountId);
    expect(found?.session.expiresAt).toBe(expiresAt);
    expect(await deleteTrainingSession(token)).toBe(true);
    expect(await store.getSessionByTokenHash(hashTrainingSessionToken(token))).toBeNull();
  });

  test('claim moves trainings and the old owner reads them as not-found', async () => {
    const store = await getTrainingStore();
    const anonId = `anon:${randomUUID()}`;
    const training = await store.forOwner(anonId).createTraining({
      id: randomUUID(),
      ownerId: anonId,
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    const { account } = await createTrainingAccount();
    const moved = await claimAnonymousTrainings(account.accountId, anonId);
    expect(moved).toBe(1);
    expect(await store.forOwner(anonId).getTraining(training.id)).toBeNull();
    expect((await store.forOwner(account.accountId).getTraining(training.id))?.id).toBe(
      training.id,
    );
    expect(await store.forOwner(anonId).listTrainings()).toEqual([]);
  });

  test('claim from a non-anonymous owner is a 409', async () => {
    const { account } = await createTrainingAccount();
    await expect(
      claimAnonymousTrainings(account.accountId, account.accountId),
    ).rejects.toBeInstanceOf(TrainingServiceError);
    await expect(
      claimAnonymousTrainings(account.accountId, account.accountId),
    ).rejects.toMatchObject({
      status: 409,
      code: 'TRAINING_NOT_ANONYMOUS_OWNER',
    });
  });

  test('account owners are isolated like any other owner', async () => {
    const store = await getTrainingStore();
    const a = await createTrainingAccount('A');
    const b = await createTrainingAccount('B');
    const training = await store.forOwner(a.account.accountId).createTraining({
      id: randomUUID(),
      ownerId: a.account.accountId,
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    expect(await store.forOwner(b.account.accountId).getTraining(training.id)).toBeNull();
    expect(await store.forOwner(b.account.accountId).listTrainings()).toEqual([]);
  });
});
