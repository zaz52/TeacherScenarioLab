import { createHmac, randomInt, randomUUID, timingSafeEqual } from 'node:crypto';
import { clientIdentity } from '@/lib/server/client-identity';
import {
  mintTrainingSessionToken,
  hashTrainingSessionToken,
  TRAINING_SESSION_TTL_MS,
} from '@/lib/training/session-auth';
import { accountDatabase, accountTransaction, AccountError, normalizeEmail } from './database';
import { sendVerificationEmail } from './mail';
import { hashPassword } from './password';

function digest(value: string) {
  const secret = process.env.OPENMAIC_SECRET_KEY;
  if (!secret) throw new AccountError(503, 'ACCOUNT_SERVICE_UNAVAILABLE');
  return createHmac('sha256', secret).update(value).digest('hex');
}
interface Challenge {
  id: string;
  email: string;
  purpose: 'login' | 'bind' | 'register' | 'reset';
  account_id: string | null;
  code_hash: string;
  expires_at: string;
  attempts: number;
  consumed_at: string | null;
  state: string;
  display_name: string;
}

export async function requestEmailCode(
  req: Request,
  input: { email: string; displayName?: string; purpose: 'login' | 'bind' | 'register' | 'reset' },
  ownerId?: string,
) {
  const email = normalizeEmail(input.email);
  if (input.purpose === 'bind' && !ownerId) throw new AccountError(401, 'LOGIN_REQUIRED');
  const id = randomUUID(),
    code = String(randomInt(0, 1000000)).padStart(6, '0'),
    now = Date.now();
  const ipHash = digest('otp-ip:' + clientIdentity(req));
  await accountTransaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['otp:' + email]);
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['otp-ip:' + ipHash]);
    const limits = await tx.query(
      `SELECT
      (SELECT count(*) FROM teacherlab_email_challenges WHERE email=$1 AND created_at>$2) AS minute,
      (SELECT count(*) FROM teacherlab_email_challenges WHERE email=$1 AND created_at>$3) AS hour,
      (SELECT count(*) FROM teacherlab_email_challenges WHERE ip_hash=$4 AND created_at>$5) AS ip`,
      [email, now - 60000, now - 3600000, ipHash, now - 900000],
    );
    if (
      Number(limits.rows[0].minute) > 0 ||
      Number(limits.rows[0].hour) >= 5 ||
      Number(limits.rows[0].ip) >= 20
    )
      throw new AccountError(429, 'CODE_RATE_LIMITED');
    await tx.query(
      `INSERT INTO teacherlab_email_challenges(id,email,purpose,account_id,code_hash,expires_at,created_at,state,ip_hash,display_name) VALUES($1,$2,$3,$4,$5,$6,$7,'pending',$8,$9)`,
      [
        id,
        email,
        input.purpose,
        ownerId ?? null,
        digest(id + ':' + code),
        now + 600000,
        now,
        ipHash,
        (input.displayName ?? '').trim().slice(0, 200),
      ],
    );
    await tx.query('DELETE FROM teacherlab_email_challenges WHERE created_at<$1', [now - 86400000]);
  });
  try {
    await sendVerificationEmail(email, code);
    await (
      await accountDatabase()
    ).query("UPDATE teacherlab_email_challenges SET state='sent' WHERE id=$1", [id]);
  } catch (error) {
    await (
      await accountDatabase()
    ).query("UPDATE teacherlab_email_challenges SET state='failed' WHERE id=$1", [id]);
    if (error instanceof AccountError) throw error;
    throw new AccountError(503, 'EMAIL_DELIVERY_FAILED');
  }
  return { challengeId: id, expiresIn: 600, retryAfter: 60 };
}

export async function verifyEmailCode(
  input: { challengeId: string; code: string; password?: string },
  bindingOwner?: string,
) {
  const pool = await accountDatabase();
  const lookup = await pool.query('SELECT email FROM teacherlab_email_challenges WHERE id=$1', [
    input.challengeId,
  ]);
  if (!lookup.rowCount) throw new AccountError(400, 'CODE_INVALID');
  const result = await accountTransaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['otp:' + lookup.rows[0].email]);
    const selected = await tx.query(
      'SELECT * FROM teacherlab_email_challenges WHERE id=$1 FOR UPDATE',
      [input.challengeId],
    );
    const row = selected.rows[0] as Challenge | undefined;
    if (
      !row ||
      row.state !== 'sent' ||
      row.consumed_at ||
      Number(row.expires_at) < Date.now() ||
      row.attempts >= 5
    )
      return { error: 'CODE_INVALID' as const };
    await tx.query('UPDATE teacherlab_email_challenges SET attempts=attempts+1 WHERE id=$1', [
      row.id,
    ]);
    const expected = Buffer.from(row.code_hash, 'hex'),
      supplied = Buffer.from(digest(row.id + ':' + input.code), 'hex');
    if (expected.length !== supplied.length || !timingSafeEqual(expected, supplied))
      return { error: 'CODE_INVALID' as const };
    if (row.purpose === 'bind' && (!bindingOwner || row.account_id !== bindingOwner))
      return { error: 'CODE_INVALID' as const };
    const identity = await tx.query(
      'SELECT account_id,verified_at FROM teacherlab_email_identities WHERE email=$1 FOR UPDATE',
      [row.email],
    );
    let accountId = identity.rows[0]?.account_id as string | undefined;
    if ((row.purpose === 'register' || row.purpose === 'reset') && !input.password)
      return { error: 'PASSWORD_REQUIRED' as const };
    if (row.purpose === 'register' && identity.rows[0]?.verified_at)
      return { error: 'EMAIL_ALREADY_USED' as const };
    if ((row.purpose === 'login' || row.purpose === 'reset') && !identity.rows[0]?.verified_at)
      return { error: 'ACCOUNT_NOT_FOUND' as const };
    if (row.purpose === 'bind') {
      if (accountId && accountId !== bindingOwner) return { error: 'EMAIL_ALREADY_USED' as const };
      const existing = await tx.query(
        'SELECT email FROM teacherlab_email_identities WHERE account_id=$1',
        [bindingOwner],
      );
      if (existing.rowCount && existing.rows[0].email !== row.email)
        return { error: 'EMAIL_ALREADY_BOUND' as const };
      accountId = bindingOwner!;
    }
    if (!accountId) {
      accountId = 'acct:' + randomUUID();
      await tx.query(
        'INSERT INTO training_accounts(account_id,display_name,roles,created_at) VALUES($1,$2,$3,$4)',
        [accountId, row.display_name || row.email.split('@')[0], [], Date.now()],
      );
    }
    await tx.query('SELECT account_id FROM training_accounts WHERE account_id=$1 FOR UPDATE', [
      accountId,
    ]);
    const access = await tx.query(
      'SELECT disabled FROM teacherlab_account_controls WHERE account_id=$1',
      [accountId],
    );
    if (access.rows[0]?.disabled) return { error: 'ACCOUNT_DISABLED' as const };
    if (input.password && ['register', 'reset', 'bind'].includes(row.purpose)) {
      const passwordHash = await hashPassword(input.password);
      await tx.query(
        `INSERT INTO teacherlab_password_credentials(account_id,password_hash,updated_at) VALUES($1,$2,$3)
        ON CONFLICT(account_id) DO UPDATE SET password_hash=EXCLUDED.password_hash,updated_at=EXCLUDED.updated_at`,
        [accountId, passwordHash, Date.now()],
      );
      if (row.purpose === 'reset')
        await tx.query('DELETE FROM training_sessions WHERE account_id=$1', [accountId]);
      await tx.query('INSERT INTO teacherlab_account_audit VALUES($1,$2,$3,$4,$5)', [
        randomUUID(),
        accountId,
        'password-' + row.purpose,
        accountId,
        Date.now(),
      ]);
    }
    await tx.query(
      'INSERT INTO teacherlab_email_identities(email,account_id,verified_at,created_at) VALUES($1,$2,$3,$3) ON CONFLICT(email) DO UPDATE SET verified_at=EXCLUDED.verified_at',
      [row.email, accountId, Date.now()],
    );
    await tx.query('UPDATE teacherlab_email_challenges SET consumed_at=$2 WHERE id=$1', [
      row.id,
      Date.now(),
    ]);
    if (row.purpose === 'register' || row.purpose === 'reset')
      return { accountId, token: null, purpose: row.purpose };
    const token = mintTrainingSessionToken();
    await tx.query(
      'INSERT INTO training_sessions(token_hash,account_id,created_at,expires_at) VALUES($1,$2,$3,$4)',
      [
        hashTrainingSessionToken(token),
        accountId,
        Date.now(),
        Date.now() + TRAINING_SESSION_TTL_MS,
      ],
    );
    return { accountId, token, purpose: row.purpose };
  });
  if ('error' in result)
    throw new AccountError(result.error === 'ACCOUNT_DISABLED' ? 403 : 400, result.error!);
  return result;
}
