import { randomUUID } from 'node:crypto';
import { resolveTrainingAdminAccountIds } from '@/lib/training/session-auth';
import { accountDatabase, accountTransaction, AccountError, normalizeEmail } from './database';
import { siteOwnerAccountId } from './admin-access';
import { ADMIN_PERMISSIONS, type AdminPermission } from '@/lib/training/admin-permissions';

export async function listPeople() {
  const rows = await (
    await accountDatabase()
  ).query(`SELECT a.account_id AS "accountId",a.display_name AS "displayName",a.roles,
    a.created_at AS "createdAt",e.email,e.verified_at AS "verifiedAt",COALESCE(c.disabled,false) AS disabled,
    COALESCE(p.permissions,'[]'::jsonb) AS permissions
    FROM training_accounts a LEFT JOIN teacherlab_email_identities e USING(account_id)
    LEFT JOIN teacherlab_account_controls c USING(account_id)
    LEFT JOIN teacherlab_admin_permissions p USING(account_id) ORDER BY a.created_at DESC LIMIT 500`);
  const bootstrap = resolveTrainingAdminAccountIds();
  return rows.rows.map((row) => ({
    ...row,
    roles: [...new Set([...row.roles, ...(bootstrap.has(row.accountId) ? ['admin'] : [])])],
    protected: bootstrap.has(row.accountId),
    isOwner: row.accountId === siteOwnerAccountId(),
    permissions:
      row.accountId === siteOwnerAccountId()
        ? [...ADMIN_PERMISSIONS]
        : ADMIN_PERMISSIONS.filter(
            (permission) => Array.isArray(row.permissions) && row.permissions.includes(permission),
          ),
  }));
}
export async function addPerson(
  actor: string,
  input: { email: string; displayName?: string; admin: boolean; permissions?: AdminPermission[] },
) {
  if ((input.admin || input.permissions !== undefined) && actor !== siteOwnerAccountId())
    throw new AccountError(403, 'OWNER_REQUIRED');
  if (!input.admin && input.permissions?.length) throw new AccountError(400, 'INVALID_REQUEST');
  const email = normalizeEmail(input.email);
  return accountTransaction(async (tx) => {
    await tx.query('SELECT pg_advisory_xact_lock(hashtext($1))', ['otp:' + email]);
    if (
      (await tx.query('SELECT 1 FROM teacherlab_email_identities WHERE email=$1', [email])).rowCount
    )
      throw new AccountError(409, 'EMAIL_ALREADY_USED');
    const id = 'acct:' + randomUUID();
    await tx.query(
      'INSERT INTO training_accounts(account_id,display_name,roles,created_at) VALUES($1,$2,$3,$4)',
      [
        id,
        input.displayName?.trim() || email.split('@')[0],
        input.admin ? ['admin'] : [],
        Date.now(),
      ],
    );
    await tx.query(
      'INSERT INTO teacherlab_email_identities(email,account_id,created_at) VALUES($1,$2,$3)',
      [email, id, Date.now()],
    );
    if (input.admin)
      await tx.query(
        'INSERT INTO teacherlab_admin_permissions(account_id,permissions) VALUES($1,$2)',
        [id, JSON.stringify(input.permissions ?? [])],
      );
    await tx.query('INSERT INTO teacherlab_account_audit VALUES($1,$2,$3,$4,$5)', [
      randomUUID(),
      actor,
      'person-added',
      id,
      Date.now(),
    ]);
    return id;
  });
}
export async function updatePerson(
  actor: string,
  input: {
    accountId: string;
    admin?: boolean;
    disabled?: boolean;
    permissions?: AdminPermission[];
  },
) {
  const owner = actor === siteOwnerAccountId();
  if ((input.admin !== undefined || input.permissions !== undefined) && !owner)
    throw new AccountError(403, 'OWNER_REQUIRED');
  if (actor === input.accountId || resolveTrainingAdminAccountIds().has(input.accountId))
    throw new AccountError(409, 'PROTECTED_ADMIN');
  await accountTransaction(async (tx) => {
    const result = await tx.query(
      'SELECT roles FROM training_accounts WHERE account_id=$1 FOR UPDATE',
      [input.accountId],
    );
    if (!result.rowCount) throw new AccountError(404, 'ACCOUNT_NOT_FOUND');
    if (!owner && result.rows[0].roles.includes('admin'))
      throw new AccountError(403, 'OWNER_REQUIRED');
    const willBeAdmin = input.admin ?? result.rows[0].roles.includes('admin');
    if (!willBeAdmin && input.permissions?.length) throw new AccountError(400, 'INVALID_REQUEST');
    if (input.admin !== undefined) {
      const roles = new Set<string>(result.rows[0].roles);
      if (input.admin) roles.add('admin');
      else roles.delete('admin');
      await tx.query('UPDATE training_accounts SET roles=$2 WHERE account_id=$1', [
        input.accountId,
        [...roles],
      ]);
    }
    if (input.permissions !== undefined || input.admin !== undefined) {
      // Role grants start with explicit permissions; revocations erase previous grants.
      await tx.query(
        `INSERT INTO teacherlab_admin_permissions(account_id,permissions) VALUES($1,$2)
        ON CONFLICT(account_id) DO UPDATE SET permissions=EXCLUDED.permissions`,
        [input.accountId, JSON.stringify(willBeAdmin ? (input.permissions ?? []) : [])],
      );
      await tx.query('INSERT INTO teacherlab_account_audit VALUES($1,$2,$3,$4,$5)', [
        randomUUID(),
        actor,
        'admin-permissions:' + (willBeAdmin ? (input.permissions ?? []).join(',') : 'revoked'),
        input.accountId,
        Date.now(),
      ]);
    }
    if (input.disabled !== undefined)
      await tx.query(
        'INSERT INTO teacherlab_account_controls VALUES($1,$2) ON CONFLICT(account_id) DO UPDATE SET disabled=EXCLUDED.disabled',
        [input.accountId, input.disabled],
      );
    await tx.query('INSERT INTO teacherlab_account_audit VALUES($1,$2,$3,$4,$5)', [
      randomUUID(),
      actor,
      'person-access-updated',
      input.accountId,
      Date.now(),
    ]);
  });
}
