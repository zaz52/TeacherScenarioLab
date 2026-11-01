import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { Pool } from 'pg';
import { PgTrainingStore, ensureTrainingSchema } from '@openmaic/storage/training/pg';
import {
  nodePostgresTransaction,
  type ConnectableQueryable,
} from '@openmaic/storage/server/reference';

// Application TypeScript uses CommonJS; storage exports an ES module entry.
const { EPIDEMIC_SCENARIO_V1_DRAFT } = createRequire(import.meta.url)(
  '../lib/training/scenarios/epidemic-v1.ts',
) as typeof import('../lib/training/scenarios/epidemic-v1');

async function main() {
  const url = new URL(process.env.DATABASE_URL ?? '');
  assert.equal(url.hostname, '127.0.0.1');
  assert.equal(url.pathname, '/teacher_scenario_runtime');
  const pool = new Pool({ connectionString: process.env.DATABASE_URL });
  try {
    await ensureTrainingSchema(pool);
    const store = new PgTrainingStore(pool, {
      withTransaction: nodePostgresTransaction(pool as unknown as ConnectableQueryable),
    });
    const version = 9999001;
    const admin = 'acct:00000000-0000-4000-8000-000000000001';
    const tokenHash = createHash('sha256').update('ci-custom-model-admin-session').digest('hex');
    if (!(await store.getAccount(admin)))
      await store.createAccount({
        accountId: admin,
        displayName: 'Isolated model administrator',
        roles: ['learner'],
        createdAt: Date.now(),
      });
    if (!(await store.getSessionByTokenHash(tokenHash)))
      await store.createSession({
        accountId: admin,
        tokenHash,
        createdAt: Date.now(),
        expiresAt: Date.now() + 86400000,
      });
    if (!(await store.getScenarioVersion('epi-class-fever', version))) {
      await store.createScenarioVersion({
        ...EPIDEMIC_SCENARIO_V1_DRAFT,
        version,
        publishedAt: Date.now(),
      });
    }
    console.log(
      JSON.stringify({ isolatedWorkerFixture: true, scenario: 'epi-class-fever', version }),
    );
  } finally {
    await pool.end();
  }
}

void main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : 'Workers fixture initialization failed');
  process.exitCode = 1;
});
