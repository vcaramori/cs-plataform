'use client'

import { useContext } from 'react'
import { UserContext } from '@/components/providers/UserProvider'
import type { ModuleAction } from '@/lib/auth/permission-schema'
import type { UserRole } from '@/lib/supabase/types'

const ROLE_HIERARCHY: Record<UserRole, number> = {
  csm: 0,
  csm_senior: 1,
  head_cs: 2,
  admin: 3,
  super_admin: 4,
}

// Fallback para usuários sem custom_role_id — comportamento legado por módulo
function legacyFallback(role: UserRole | null, module: string, action: ModuleAction): boolean {
  if (!role) return false
  const level = ROLE_HIERARCHY[role] ?? -1

  if (action === 'view_team') {
    // Só csm_senior+ pode ver o time no fallback
    return level >= ROLE_HIERARCHY.csm_senior
  }

  // home e atividades: qualquer CSM autenticado pode ver no fallback
  if (module === 'home' || module === 'atividades') {
    return level >= ROLE_HIERARCHY.csm
  }

  return false
}

export function useModulePermission(module: string, action: ModuleAction = 'view'): boolean {
  const ctx = useContext(UserContext)
  if (!ctx) return false

  // Custom role está disponível → governa
  if (ctx.modulePermissions) {
    const perm = ctx.modulePermissions.find(p => p.module === module)
    if (!perm) return false
    return perm[action] === true
  }

  // Sem custom role → fallback para sistema built-in
  return legacyFallback(ctx.role, module, action)
}
