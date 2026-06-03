export const BUILTIN_ROLES = ['csm', 'csm_senior', 'head_cs', 'admin', 'super_admin']

/**
 * Resolve o "perfil" selecionado (role legado OU nome de um custom_role) em
 * { role, custom_role_id } para gravar em `profiles` sem violar profiles_role_check:
 * - role legado → grava role, custom_role_id=null
 * - nome de custom_role → grava custom_role_id e mantém um role legado válido como base
 *   (preserva o atual se válido, senão 'csm').
 */
export async function resolveRoleAssignment(
  admin: any,
  roleInput: string | undefined | null,
  currentRole?: string | null
): Promise<{ role: string; custom_role_id: string | null }> {
  const base = currentRole && BUILTIN_ROLES.includes(currentRole) ? currentRole : 'csm'
  if (!roleInput) return { role: base, custom_role_id: null }
  const lower = String(roleInput).toLowerCase()
  if (BUILTIN_ROLES.includes(lower)) return { role: lower, custom_role_id: null }
  const { data: cr } = await admin
    .from('custom_roles')
    .select('id')
    .ilike('name', String(roleInput))
    .maybeSingle()
  return { role: base, custom_role_id: cr?.id ?? null }
}
