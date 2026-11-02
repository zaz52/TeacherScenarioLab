import type { OwnerPrincipal } from '@/lib/server/identity/types';
import {
  ADMIN_PERMISSIONS,
  type AdminAccess,
  type AdminPermission,
} from '@/lib/training/admin-permissions';
import { resolveTrainingAdminAccountIds } from '@/lib/training/session-auth';
import { accountDatabase } from './database';

export function siteOwnerAccountId(): string | undefined {
  return (
    process.env.TEACHERLAB_OWNER_ACCOUNT_ID?.trim() || [...resolveTrainingAdminAccountIds()][0]
  );
}
export function isSiteOwner(principal: OwnerPrincipal): boolean {
  return (
    principal.kind === 'user' &&
    principal.roles.has('admin') &&
    principal.ownerId === siteOwnerAccountId()
  );
}
export async function getAdminAccess(principal: OwnerPrincipal): Promise<AdminAccess> {
  if (isSiteOwner(principal)) return { isOwner: true, permissions: [...ADMIN_PERMISSIONS] };
  if (principal.kind !== 'user' || !principal.roles.has('admin'))
    return { isOwner: false, permissions: [] };
  const result = await (
    await accountDatabase()
  ).query('SELECT permissions FROM teacherlab_admin_permissions WHERE account_id=$1', [
    principal.ownerId,
  ]);
  const saved: unknown = result.rows[0]?.permissions;
  return {
    isOwner: false,
    permissions: ADMIN_PERMISSIONS.filter(
      (permission) => Array.isArray(saved) && saved.includes(permission),
    ),
  };
}
export async function canAdmin(
  principal: OwnerPrincipal,
  permission: AdminPermission,
): Promise<boolean> {
  const access = await getAdminAccess(principal);
  return access.isOwner || access.permissions.includes(permission);
}

/** Unknown administration endpoints fail closed until assigned to a module. */
export function trainingAdminPermission(url: string | undefined): AdminPermission | undefined {
  const path = new URL(url ?? '/', 'http://localhost').pathname;
  const module = path.split('/')[4];
  return (
    {
      scenarios: 'scenarios.manage',
      trainings: 'trainings.audit',
      references: 'references.inspect',
      models: 'models.manage',
    } as const
  )[module as 'scenarios' | 'trainings' | 'references' | 'models'];
}
