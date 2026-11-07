import { createHmac, randomBytes, randomUUID, scrypt, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { clientIdentity } from '@/lib/server/client-identity';
import {
  hashTrainingSessionToken,
  mintTrainingSessionToken,
  TRAINING_SESSION_TTL_MS,
} from '@/lib/training/session-auth';
import { accountDatabase, accountTransaction, AccountError, normalizeEmail } from './database';

export const newPasswordSchema = z.string().min(8).max(128);
let activeDerivations = 0;
const dummyHash = `scrypt-v1$${randomBytes(16).toString('hex')}$${randomBytes(64).toString('hex')}`;
async function derive(password: string, salt: string): Promise<Buffer> {
  if (activeDerivations >= 2) throw new AccountError(429, 'AUTH_RATE_LIMITED');
  activeDerivations++;
  try {
    return await new Promise<Buffer>((resolve, reject) =>
      scrypt(
        password,
        Buffer.from(salt, 'hex'),
        64,
        { N: 32768, r: 8, p: 1, maxmem: 64 * 1024 * 1024 },
        (error, key) => (error ? reject(error) : resolve(key)),
      ),
    );
  } finally {
    activeDerivations--;
  }
}
export async function hashPassword(password: string) {
  const parsed = newPasswordSchema.safeParse(password);
  if (!parsed.success) throw new AccountError(400, 'INVALID_PASSWORD');
  const salt = randomBytes(16).toString('hex');
  return `scrypt-v1$${salt}$${(await derive(password, salt)).toString('hex')}`;
}
async function matchesPassword(password: string, encoded: string | undefined) {
  const value =
    encoded && /^scrypt-v1\$[a-f0-9]{32}\$[a-f0-9]{128}$/.test(encoded) ? encoded : dummyHash;
  const [, salt, expected] = value.split('$');
  return (
    timingSafeEqual(await derive(password, salt), Buffer.from(expected, 'hex')) && Boolean(encoded)
  );
}
async function reserveAttempt(req: Request, email: string) {
  const secret = process.env.OPENMAIC_SECRET_KEY;
  if (!secret) throw new AccountError(503, 'ACCOUNT_SERVICE_UNAVAILABLE');
  const fingerprint = (value: string) => createHmac('sha256', secret).update(value).digest('hex');
  const subject = fingerprint('password-email:' + email),
    ip = fingerprint('password-ip:' + clientIdentity(req)),
    now = Date.now();
  await accountTransaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['password:' + subject]);
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['password-ip:' + ip]);
    const counts = await tx.query(
      `SELECT
      (SELECT count(*) FROM teacherlab_password_attempts WHERE subject_hash=$1 AND created_at>$3) AS subject,
      (SELECT count(*) FROM teacherlab_password_attempts WHERE ip_hash=$2 AND created_at>$3) AS ip`,
      [subject, ip, now - 900000],
    );
    if (Number(counts.rows[0].subject) >= 8 || Number(counts.rows[0].ip) >= 25)
      throw new AccountError(429, 'AUTH_RATE_LIMITED');
    await tx.query('INSERT INTO teacherlab_password_attempts VALUES($1,$2,$3,$4)', [
      randomUUID(),
      subject,
      ip,
      now,
    ]);
    await tx.query('DELETE FROM teacherlab_password_attempts WHERE created_at<$1', [
      now - 86400000,
    ]);
  });
}
export async function loginWithPassword(req: Request, input: { email: string; password: string }) {
  const email = normalizeEmail(input.email);
  await reserveAttempt(req, email);
  const result = await (
    await accountDatabase()
  ).query(
    `SELECT e.account_id,e.verified_at,p.password_hash,COALESCE(c.disabled,false) AS disabled
    FROM teacherlab_email_identities e LEFT JOIN teacherlab_password_credentials p USING(account_id)
    LEFT JOIN teacherlab_account_controls c USING(account_id) WHERE e.email=$1`,
    [email],
  );
  const row = result.rows[0];
  const matched = await matchesPassword(input.password, row?.password_hash);
  if (!matched || !row?.verified_at || row.disabled) throw new AccountError(401, 'INVALID_LOGIN');
  return accountTransaction(async (tx) => {
    const current = await tx.query(
      `SELECT p.password_hash,COALESCE(c.disabled,false) AS disabled
      FROM training_accounts a LEFT JOIN teacherlab_password_credentials p USING(account_id)
      LEFT JOIN teacherlab_account_controls c USING(account_id) WHERE a.account_id=$1 FOR UPDATE OF a`,
      [row.account_id],
    );
    if (current.rows[0]?.password_hash !== row.password_hash || current.rows[0]?.disabled)
      throw new AccountError(401, 'INVALID_LOGIN');
    const token = mintTrainingSessionToken(),
      now = Date.now();
    await tx.query(
      'INSERT INTO training_sessions(token_hash,account_id,created_at,expires_at) VALUES($1,$2,$3,$4)',
      [hashTrainingSessionToken(token), row.account_id, now, now + TRAINING_SESSION_TTL_MS],
    );
    return { accountId: row.account_id as string, token };
  });
}
