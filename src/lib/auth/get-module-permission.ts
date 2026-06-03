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
    .select('role, custom_role_id, is_super_admin')
    .eq('id', userId)
    .single()

  if (error || !data) return false

  // Acesso Total (super admin): irrestrito a qualquer módulo/ação.
  if (data.is_super_admin || data.role === 'super_admin') return true

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

export type AccessScope = 'global' | 'own' | 'none'

/**
 * Escopo de acesso de um usuário a um módulo:
 *  - 'global': vê todos os registros
 *  - 'own':    vê apenas os próprios (filtra por csm_owner_id)
 *  - 'none':   sem acesso
 *
 * Modelo de visibilidade (decisão de produto, 2026-06-03): TODO usuário INTERNO
 * tem visão geral (a restrição por CSM responsável vive só na tela Home, que tem
 * filtro próprio). Logo, para internos o escopo nunca é 'own' — onde haveria 'own'
 * vira 'global'; 'none' (sem 'view') continua valendo e esconde o módulo.
 * Usuários externos (portal) mantêm o escopo restrito ao próprio dono.
 */
export async function getUserAccessScope(userId: string, module: string): Promise<AccessScope> {
  const supabase = getSupabaseAdminClient() as any
  const { data, error } = await supabase
    .from('profiles')
    .select('role, custom_role_id, is_super_admin, user_type')
    .eq('id', userId)
    .single()

  if (error || !data) return 'none'
  if (data.is_super_admin || data.role === 'super_admin') return 'global'

  // Interno = qualquer usuário que não seja do portal externo.
  const isInternal = (data.user_type ?? 'internal') !== 'external'

  if (data.custom_role_id) {
    if (await getModulePermission(userId, module, 'view_team')) return 'global'
    if (await getModulePermission(userId, module, 'view')) return isInternal ? 'global' : 'own'
    return 'none'
  }

  // Fallback legado por hierarquia de role.
  const level = ROLE_HIERARCHY[data.role as UserRole] ?? -1
  if (level >= ROLE_HIERARCHY.csm_senior) return 'global'
  if (level >= ROLE_HIERARCHY.csm) return isInternal ? 'global' : 'own'
  return 'none'
}
