/**
 * TeacherScenarioLab — PgTrainingStore contract tests against real PostgreSQL.
 *
 * Runs only when PG_CONTRACT_URL is set (same convention as the
 * agent-session .pg.test.ts suites); otherwise the suite skips. The
 * training tables live in the test database and are truncated before
 * each test — never point PG_CONTRACT_URL at a database you care about.
 */
import { randomUUID } from 'node:crypto';

import { Pool } from 'pg';
import { afterAll, beforeAll, beforeEach, describe, expect, test } from 'vitest';

import {
  ensureTrainingSchema,
  PgTrainingStore,
  TrainingNotFoundError,
  TrainingScenarioFrozenError,
  type Queryable,
  type WithTransaction,
} from '../src/training/pg.js';

const contractUrl = process.env.PG_CONTRACT_URL;
const describePg = contractUrl ? describe : describe.skip;

function transactionFor(pool: Pool): WithTransaction {
  return async (body) => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await body(client as Queryable);
      await client.query('COMMIT');
      return result;
    } catch (error) {
      try {
        await client.query('ROLLBACK');
      } catch {
        // Preserve the transaction body's original error.
      }
      throw error;
    } finally {
      client.release();
    }
  };
}

describePg('PgTrainingStore (PostgreSQL contract)', () => {
  let pool: Pool;
  let store: PgTrainingStore;

  beforeAll(async () => {
    pool = new Pool({ connectionString: contractUrl });
    await ensureTrainingSchema(pool);
    store = new PgTrainingStore(pool, {
      withTransaction: transactionFor(pool),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM training_snapshots');
    await pool.query('DELETE FROM training_events');
    await pool.query('DELETE FROM training_messages');
    await pool.query('DELETE FROM trainings');
  });

  test('migrations create the training tables', async () => {
    const result = await pool.query(
      `SELECT tablename FROM pg_tables
        WHERE schemaname = 'public' AND tablename LIKE 'training%'
        ORDER BY tablename`,
    );
    const names = result.rows.map((row) => row.tablename as string);
    expect(names).toContain('trainings');
    expect(names).toContain('training_messages');
    expect(names).toContain('training_events');
    expect(names).toContain('training_snapshots');
  });

  test('create + get round-trip for the bound owner', async () => {
    const owner = store.forOwner('owner-1');
    const created = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'owner-1',
      scenarioId: 'epi-school-closure',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    expect(created.state).toBe('created');
    expect(created.completedAt).toBeNull();
    const fetched = await owner.getTraining(created.id);
    expect(fetched).toEqual(created);
  });

  test('owner scoping: lists are per-owner, foreign reads look absent', async () => {
    const a = store.forOwner('owner-a');
    const b = store.forOwner('owner-b');
    const trainingA = await a.createTraining({
      id: randomUUID(),
      ownerId: 'owner-a',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    await b.createTraining({
      id: randomUUID(),
      ownerId: 'owner-b',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    expect((await a.listTrainings()).map((t) => t.id)).toEqual([trainingA.id]);
    expect(await b.getTraining(trainingA.id)).toBeNull();
    expect(await b.listMessages(trainingA.id)).toEqual([]);
  });

  test('unbound list requires explicit includeAllOwners', async () => {
    await expect(store.listTrainings()).rejects.toThrow(/includeAllOwners/);
    await store.forOwner('owner-x').createTraining({
      id: randomUUID(),
      ownerId: 'owner-x',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    expect((await store.listTrainings({ includeAllOwners: true })).length).toBe(1);
  });

  test('appendMessage is idempotent on the same key', async () => {
    const owner = store.forOwner('owner-1');
    const training = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'owner-1',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'briefing',
      now: 1000,
    });
    const key = randomUUID();
    const first = await owner.appendMessage({
      id: randomUUID(),
      trainingId: training.id,
      characterId: null,
      role: 'user',
      content: 'hello',
      idempotencyKey: key,
      createdAt: 1001,
    });
    const second = await owner.appendMessage({
      id: randomUUID(),
      trainingId: training.id,
      characterId: null,
      role: 'user',
      content: 'hello',
      idempotencyKey: key,
      createdAt: 1002,
    });
    expect(first.deduped).toBe(false);
    expect(second.deduped).toBe(true);
    expect(second.message.id).toBe(first.message.id);
    expect(await owner.listMessages(training.id)).toHaveLength(1);
  });

  test('transitionState is a compare-and-swap', async () => {
    const owner = store.forOwner('owner-1');
    const training = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'owner-1',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    expect(await owner.transitionState(training.id, 'briefing', 'fact-checking', 1001)).toBe(
      false,
    );
    expect(await owner.transitionState(training.id, 'created', 'briefing', 1001)).toBe(
      true,
    );
    expect((await owner.getTraining(training.id))?.state).toBe('briefing');
    expect(
      await owner.transitionState(training.id, 'evaluation', 'completed', 1002),
    ).toBe(false);
    await owner.transitionState(training.id, 'briefing', 'fact-checking', 1003);
    await owner.transitionState(training.id, 'fact-checking', 'coordination', 1004);
    await owner.transitionState(training.id, 'coordination', 'proposal', 1005);
    await owner.transitionState(training.id, 'proposal', 'evaluation', 1006);
    expect(await owner.transitionState(training.id, 'evaluation', 'completed', 1007)).toBe(
      true,
    );
    const done = await owner.getTraining(training.id);
    expect(done?.state).toBe('completed');
    expect(done?.completedAt).toBe(1007);
  });

  test('events append and list in order; snapshots save and get', async () => {
    const owner = store.forOwner('owner-1');
    const training = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'owner-1',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'created',
      now: 1000,
    });
    await owner.appendEvent({
      id: randomUUID(),
      trainingId: training.id,
      type: 'training-created',
      payload: {},
      createdAt: 1000,
    });
    await owner.appendEvent({
      id: randomUUID(),
      trainingId: training.id,
      type: 'fact-disclosed',
      payload: { factId: 'fact-public-1' },
      createdAt: 1001,
    });
    const events = await owner.listEvents(training.id);
    expect(events.map((e) => e.type)).toEqual(['training-created', 'fact-disclosed']);
    expect(events[1]?.payload).toEqual({ factId: 'fact-public-1' });

    const snapshot = await owner.saveSnapshot({
      id: randomUUID(),
      trainingId: training.id,
      data: { training, messages: [], events },
      createdAt: 1002,
    });
    expect(await owner.getSnapshot(snapshot.id)).toEqual(snapshot);
    expect(await store.forOwner('owner-2').getSnapshot(snapshot.id)).toBeNull();
  });

  test('markSuperseded hides the old message by default', async () => {
    const owner = store.forOwner('owner-1');
    const training = await owner.createTraining({
      id: randomUUID(),
      ownerId: 'owner-1',
      scenarioId: 's',
      scenarioVersion: 1,
      state: 'briefing',
      now: 1000,
    });
    const old = await owner.appendMessage({
      id: randomUUID(),
      trainingId: training.id,
      characterId: null,
      role: 'user',
      content: 'first draft',
      idempotencyKey: null,
      createdAt: 1001,
    });
    const replacement = await owner.appendMessage({
      id: randomUUID(),
      trainingId: training.id,
      characterId: null,
      role: 'user',
      content: 'second draft',
      idempotencyKey: null,
      createdAt: 1002,
    });
    expect(
      await owner.markSuperseded(training.id, old.message.id, replacement.message.id),
    ).toBe(true);
    expect((await owner.listMessages(training.id)).map((m) => m.content)).toEqual([
      'second draft',
    ]);
    expect(
      (await owner.listMessages(training.id, { includeSuperseded: true })).map(
        (m) => m.content,
      ),
    ).toEqual(['first draft', 'second draft']);
  });

  test('withTransaction commits and rolls back atomically', async () => {
    const owner = store.forOwner('owner-1');
    const trainingId = randomUUID();
    await owner.withTransaction(async (tx) => {
      await tx.createTraining({
        id: trainingId,
        ownerId: 'owner-1',
        scenarioId: 's',
        scenarioVersion: 1,
        state: 'created',
        now: 1000,
      });
      await tx.appendMessage({
        id: randomUUID(),
        trainingId,
        characterId: null,
        role: 'user',
        content: 'inside tx',
        idempotencyKey: null,
        createdAt: 1001,
      });
    });
    expect(await owner.getTraining(trainingId)).not.toBeNull();
    expect(await owner.listMessages(trainingId)).toHaveLength(1);

    const doomedId = randomUUID();
    await expect(
      owner.withTransaction(async (tx) => {
        await tx.createTraining({
          id: doomedId,
          ownerId: 'owner-1',
          scenarioId: 's',
          scenarioVersion: 1,
          state: 'created',
          now: 1000,
        });
        throw new Error('boom');
      }),
    ).rejects.toThrow('boom');
    expect(await owner.getTraining(doomedId)).toBeNull();
  });

  test('writes to a missing training throw TrainingNotFoundError', async () => {
    const owner = store.forOwner('owner-1');
    const missing = randomUUID();
    await expect(
      owner.appendMessage({
        id: randomUUID(),
        trainingId: missing,
        characterId: null,
        role: 'user',
        content: 'x',
        idempotencyKey: null,
        createdAt: 1000,
      }),
    ).rejects.toBeInstanceOf(TrainingNotFoundError);
  });
});

describePg('PgTrainingStore scenarios (PostgreSQL contract)', () => {
  let pool: Pool;
  let store: PgTrainingStore;

  function scenario(overrides: Record<string, unknown> = {}) {
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
      publishedAt: null,
      ...overrides,
    } as Parameters<PgTrainingStore['saveScenarioVersion']>[0];
  }

  beforeAll(async () => {
    pool = new Pool({ connectionString: contractUrl });
    await ensureTrainingSchema(pool);
    store = new PgTrainingStore(pool, {
      withTransaction: transactionFor(pool),
    });
  });

  afterAll(async () => {
    await pool.end();
  });

  beforeEach(async () => {
    await pool.query('DELETE FROM training_snapshots');
    await pool.query('DELETE FROM training_events');
    await pool.query('DELETE FROM training_messages');
    await pool.query('DELETE FROM trainings');
    await pool.query('DELETE FROM training_scenarios');
  });

  test('save + get round-trip, versions list in order', async () => {
    await store.saveScenarioVersion(scenario());
    await store.saveScenarioVersion(scenario({ version: 2, publishedAt: 2000 }));
    const fetched = await store.getScenarioVersion('test-scenario', 1);
    expect(fetched?.title).toBe('Test scenario');
    expect(fetched?.publishedAt).toBeNull();
    const versions = await store.listScenarioVersions('test-scenario');
    expect(versions.map((v) => v.version)).toEqual([1, 2]);
    expect(versions[1]?.publishedAt).toBe(2000);
    expect(await store.getScenarioVersion('test-scenario', 99)).toBeNull();
  });

  test('drafts can be overwritten, published versions are frozen', async () => {
    await store.saveScenarioVersion(scenario());
    await store.saveScenarioVersion(scenario({ title: 'Draft v2 text' }));
    expect((await store.getScenarioVersion('test-scenario', 1))?.title).toBe(
      'Draft v2 text',
    );
    await store.saveScenarioVersion(scenario({ title: 'Published', publishedAt: 3000 }));
    expect((await store.getScenarioVersion('test-scenario', 1))?.publishedAt).toBe(3000);
    await expect(
      store.saveScenarioVersion(scenario({ title: 'Edited after publish' })),
    ).rejects.toBeInstanceOf(TrainingScenarioFrozenError);
    await expect(
      store.saveScenarioVersion(scenario({ title: 'Published', publishedAt: 3000 })),
    ).rejects.toBeInstanceOf(TrainingScenarioFrozenError);
    expect((await store.getScenarioVersion('test-scenario', 1))?.title).toBe('Published');
  });
});
