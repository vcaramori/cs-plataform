import { UserRole } from '../supabase/types'

export type Permission =
  | 'view:accounts'
  | 'view:all_accounts'
  | 'view:users'
  | 'manage:users'
  | 'manage:roles'
  | 'view:admin'
  | 'manage:admin'
  | 'view:settings'
  | 'manage:settings'
  | 'view:audit_log'

export const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  csm: [
    'view:accounts', // only their own via RLS
  ],
  csm_senior: [
    'view:accounts', // only their own via RLS
    'view:users',
  ],
  head_cs: [
    'view:accounts', // all accounts
    'view:users',
    'manage:users', // can change roles except super_admin
    'view:audit_log',
  ],
  admin: [
    'view:accounts',
    'view:users',
    'manage:users',
    'view:admin',
    'manage:admin',
    'view:settings',
    'manage:settings',
    'view:audit_log',
  ],
  super_admin: [
    'view:accounts',
    'view:users',
    'manage:users',
    'manage:roles',
    'view:admin',
    'manage:admin',
    'view:settings',
    'manage:settings',
    'view:audit_log',
  ],
}

export function hasPermission(role: UserRole | null | undefined, permission: Permission): boolean {
  if (!role) return false
  const permissions = ROLE_PERMISSIONS[role]
  return permissions.includes(permission)
}

export function hasAnyPermission(role: UserRole | null | undefined, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.some((p) => hasPermission(role, p))
}

export function hasAllPermissions(role: UserRole | null | undefined, permissions: Permission[]): boolean {
  if (!role) return false
  return permissions.every((p) => hasPermission(role, p))
}

export function canManageUser(
  authRole: UserRole | null | undefined,
  targetRole: UserRole,
  authIsSuperAdmin = false
): boolean {
  // Acesso Total (super admin) gerencia qualquer um
  if (authIsSuperAdmin) return true
  if (!authRole) return false

  // Super admin legado pode gerenciar qualquer um
  if (authRole === 'super_admin') return true

  // Admin can manage anyone except super_admin and other admins
  if (authRole === 'admin') return targetRole !== 'super_admin' && targetRole !== 'admin'

  // Head CS can only view
  return false
}
