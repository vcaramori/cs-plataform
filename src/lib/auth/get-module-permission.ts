import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { parsePermissions, type ModuleAction } from '@/lib/auth/permission-schema'
import type { UserRole } from '@/lib/supabase/types'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  csm: 0,
  csm_senior: 1,
  head_cs: 2,
  admin: 3,
  super_admin: 4,
}

function legacyFallback(role: UserRole | null, module: string, action: ModuleAction): boolean {
  if (!role) return false
  const level = ROLE_HIERARCHY[role as UserRole] ?? -1
  if (action === 'view_team') return level >= ROLE_HIERARCHY.csm_senior
  if (module === 'home' || module === 'atividades') return level >= ROLE_HIERARCHY.csm
  return false
}

export async function getModulePermission(
  userId: string,
  module: string,
  action: ModuleAction = 'view'
): Promise<boolean> {
  const supabase = getSupabaseAdminClient() as any

  // Query 1: fetch profile without join — safe even before migration is applied.
  const { data, error } = await supabase
    .from('profiles')
    .select('role, custom_role_id')
    .eq('id', userId)
    .single()

  if (error || !data) return false

  // Query 2: resolve custom role permissions only when FK is present.
  const customRoleId = data.custom_role_id ?? null
  if (customRoleId) {
    const { data: crData } = await supabase
      .from('custom_roles')
      .select('permissions')
      .eq('id', customRoleId)
      .single()

    const rawPerms = crData?.permissions ?? null
    if (rawPerms) {
      const permissions = parsePermissions(rawPerms)
      if (permissions) {
        const perm = permissions.find((p: any) => p.module === module)
        if (!perm) return false
        return perm[action] === true
      }
    }
  }

  return legacyFallback(data.role as UserRole, module, action)
}
