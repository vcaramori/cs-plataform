import type { UserRole } from '@/lib/supabase/types'

/**
 * Papéis de liderança em CS — enxergam o portfólio inteiro (todas as contas),
 * não apenas a própria carteira. Espelha o `view_team` do ROLE_HIERARCHY
 * (nível ≥ csm_senior) em get-module-permission.ts.
 */
const LEADERSHIP_ROLES: ReadonlySet<UserRole> = new Set<UserRole>([
  'csm_senior',
  'head_cs',
  'admin',
  'super_admin',
])

/** True quando o papel vê o portfólio inteiro (líder/gestor/admin). */
export function isLeadershipRole(role: UserRole | null | undefined): boolean {
  return role != null && LEADERSHIP_ROLES.has(role)
}
