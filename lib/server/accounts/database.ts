import { getServerPersistenceProvider } from '@/lib/persistence/server-provider';
import { withSchemaBootstrapLock } from '@/lib/persistence/schema-bootstrap-lock';
import { getTrainingStore } from '@/lib/training/server';
import type { PoolClient } from 'pg';
import { z } from 'zod';

let ready: { url: string; promise: Promise<void> } | undefined;
export async function accountDatabase() {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) throw new AccountError(503, 'ACCOUNT_SERVICE_UNAVAILABLE');
  await getTrainingStore();
  const { pool } = await getServerPersistenceProvider(url);
  if (ready?.url !== url) {
    const promise = withSchemaBootstrapLock(pool, async (tx) => {
      await tx.query(`
        CREATE TABLE IF NOT EXISTS teacherlab_email_identities (
          email TEXT PRIMARY KEY, account_id TEXT UNIQUE NOT NULL REFERENCES training_accounts(account_id) ON DELETE CASCADE,
          verified_at BIGINT, created_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS teacherlab_account_controls (
          account_id TEXT PRIMARY KEY REFERENCES training_accounts(account_id) ON DELETE CASCADE,
          disabled BOOLEAN NOT NULL DEFAULT false
        );
        CREATE TABLE IF NOT EXISTS teacherlab_email_challenges (
          id TEXT PRIMARY KEY, email TEXT NOT NULL, purpose TEXT NOT NULL, account_id TEXT,
          code_hash TEXT NOT NULL, expires_at BIGINT NOT NULL, attempts INTEGER NOT NULL DEFAULT 0,
          created_at BIGINT NOT NULL, consumed_at BIGINT, state TEXT NOT NULL, ip_hash TEXT NOT NULL,
          display_name TEXT NOT NULL DEFAULT ''
        );
        CREATE INDEX IF NOT EXISTS teacherlab_email_challenges_email_time ON teacherlab_email_challenges(email,created_at);
        CREATE INDEX IF NOT EXISTS teacherlab_email_challenges_ip_time ON teacherlab_email_challenges(ip_hash,created_at);
        CREATE TABLE IF NOT EXISTS teacherlab_site_settings (key TEXT PRIMARY KEY, data JSONB NOT NULL);
        CREATE TABLE IF NOT EXISTS teacherlab_account_audit (
          id TEXT PRIMARY KEY, actor TEXT NOT NULL, action TEXT NOT NULL, subject TEXT NOT NULL, created_at BIGINT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS teacherlab_user_model_routing (owner_id TEXT PRIMARY KEY, data JSONB NOT NULL);
        CREATE TABLE IF NOT EXISTS teacherlab_admin_permissions (
          account_id TEXT PRIMARY KEY REFERENCES training_accounts(account_id) ON DELETE CASCADE,
          permissions JSONB NOT NULL DEFAULT '[]'::jsonb
        );
      `);
    });
    ready = { url, promise };
    promise.catch(() => {
      ready = undefined;
    });
  }
  await ready.promise;
  return pool;
}

export async function accountTransaction<T>(body: (tx: PoolClient) => Promise<T>) {
  const client = await (await accountDatabase()).connect();
  try {
    await client.query('BEGIN');
    const value = await body(client);
    await client.query('COMMIT');
    return value;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

export class AccountError extends Error {
  constructor(
    readonly status: number,
    readonly code: string,
  ) {
    super(code);
  }
}

export function normalizeEmail(value: string) {
  const email = value.trim().toLowerCase();
  if (!z.string().email().max(254).safeParse(email).success) {
    throw new AccountError(400, 'INVALID_EMAIL');
  }
  return email;
}

export async function accountAccess(accountId: string) {
  const result = await (
    await accountDatabase()
  ).query(
    `SELECT e.email,e.verified_at,COALESCE(c.disabled,false) AS disabled FROM training_accounts a
     LEFT JOIN teacherlab_email_identities e USING(account_id) LEFT JOIN teacherlab_account_controls c USING(account_id)
     WHERE a.account_id=$1`,
    [accountId],
  );
  return result.rows[0] as
    | { email: string | null; verified_at: string | null; disabled: boolean }
    | undefined;
}
