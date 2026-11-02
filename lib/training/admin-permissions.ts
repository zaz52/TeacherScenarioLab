/** Delegated administration modules. Site ownership and mail configuration cannot be delegated. */
export const ADMIN_PERMISSIONS = [
  'scenarios.manage',
  'trainings.audit',
  'references.inspect',
  'models.manage',
  'people.manage',
] as const;
export type AdminPermission = (typeof ADMIN_PERMISSIONS)[number];
export interface AdminAccess {
  isOwner: boolean;
  permissions: AdminPermission[];
}
export function hasAdminPermission(
  access: AdminAccess | null | undefined,
  permission: AdminPermission,
) {
  return access?.isOwner === true || access?.permissions.includes(permission) === true;
}
