export const BUILTIN_ROLES = ['csm', 'csm_senior', 'head_cs', 'admin', 'super_admin']

/**
 * Resolve o "perfil" selecionado (nome de um custom_role OU role legado) em
 * { role, custom_role_id } para gravar em `profiles` sem violar profiles_role_check:
 * - nome de custom_role → grava custom_role_id e mantém um role legado válido como base
 *   (preserva o atual se válido, senão 'csm').
 * - role legado → grava role, custom_role_id=null
 *
 * IMPORTANTE: o custom_role tem PRECEDÊNCIA sobre o builtin. Sem isso, um custom
 * role com nome que colide com um builtin (ex.: "CSM" ~ 'csm') era tratado como
 * role legado e o custom_role_id nunca era gravado — o perfil "sumia" no refresh.
 */
export async function resolveRoleAssignment(
  admin: any,
  roleInput: string | undefined | null,
  currentRole?: string | null
): Promise<{ role: string; custom_role_id: string | null }> {
  const base = currentRole && BUILTIN_ROLES.includes(currentRole) ? currentRole : 'csm'
  if (!roleInput) return { role: base, custom_role_id: null }

  // 1) custom role por nome tem precedência (cobre nomes que colidem com builtin)
  const { data: cr } = await admin
    .from('custom_roles')
    .select('id')
    .ilike('name', String(roleInput))
    .maybeSingle()
  if (cr?.id) return { role: base, custom_role_id: cr.id }

  // 2) role legado/builtin
  const lower = String(roleInput).toLowerCase()
  if (BUILTIN_ROLES.includes(lower)) return { role: lower, custom_role_id: null }

  // 3) desconhecido → base, sem custom role
  return { role: base, custom_role_id: null }
}
