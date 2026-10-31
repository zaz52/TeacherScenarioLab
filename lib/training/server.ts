/**
 * TeacherScenarioLab — server-side training store construction.
 *
 * Mirrors the agent runtime's store bootstrap shape (memoized on the
 * trimmed DATABASE_URL, schema ensured under the bootstrap advisory lock,
 * one checked-out client per transaction) without importing agent-runtime
 * modules: training must stay independent of the agent session system.
 *
 * The store is created lazily on first use so importing this module never
 * opens a pool; DATABASE_URL is required at that point (the dev server
 * already refuses to start without it).
 */
import {
  PgTrainingStore,
  ensureTrainingSchema,
  type Queryable,
  type WithTransaction,
} from '@openmaic/storage/training/pg';
import type { ConnectableQueryable } from '@openmaic/storage/server/reference';
import { Pool } from 'pg';

import { withSchemaBootstrapLock } from '@/lib/persistence/schema-bootstrap-lock';

interface TrainingStoreState {
  connectionString?: string;
  storePromise?: Promise<PgTrainingStore>;
}

const TRAINING_STORE_STATE_KEY = Symbol.for('openmaic.training.store');
const globalState = globalThis as typeof globalThis & {
  [TRAINING_STORE_STATE_KEY]?: TrainingStoreState;
};
const storeState = (globalState[TRAINING_STORE_STATE_KEY] ??= {});

/** Adapt a node-postgres pool to the storage package's transaction contract. */
function nodePostgresTransaction(pool: Pool): WithTransaction {
  return async <T>(body: (queryable: Queryable) => Promise<T>): Promise<T> => {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const result = await body(client as unknown as Queryable);
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

async function createTrainingStore(connectionString: string): Promise<PgTrainingStore> {
  const pool = new Pool({ connectionString });
  try {
    await withSchemaBootstrapLock(pool as unknown as ConnectableQueryable, (queryable) =>
      ensureTrainingSchema(queryable),
    );
    return new PgTrainingStore(pool, { withTransaction: nodePostgresTransaction(pool) });
  } catch (error) {
    await pool.end().catch(() => {});
    throw error;
  }
}

export async function getTrainingStore(): Promise<PgTrainingStore> {
  const connectionString = (process.env.DATABASE_URL ?? '').trim();
  if (!connectionString) {
    throw new Error('DATABASE_URL is not configured');
  }
  if (storeState.storePromise && storeState.connectionString === connectionString) {
    return storeState.storePromise;
  }
  storeState.connectionString = connectionString;
  const initialization = createTrainingStore(connectionString).catch((error) => {
    if (storeState.storePromise === initialization) {
      storeState.storePromise = undefined;
      storeState.connectionString = undefined;
    }
    throw error;
  });
  storeState.storePromise = initialization;
  return initialization;
}
