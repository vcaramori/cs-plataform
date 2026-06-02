import type { AccessScope } from './get-module-permission'

export type { AccessScope }
export { getUserAccessScope } from './get-module-permission'

/**
 * Aplica o filtro de "dono" a uma query Supabase conforme o escopo:
 *  - 'own'    → query.eq(col, userId)
 *  - 'global' → sem filtro
 *  - 'none'   → query impossível (col = '' nunca casa) — o caller deveria checar antes
 *
 * Genérico para encadear com o query builder do supabase-js.
 */
export function applyOwnerScope<T extends { eq: (col: string, val: any) => T }>(
  query: T,
  scope: AccessScope,
  userId: string,
  col = 'csm_owner_id'
): T {
  if (scope === 'own') return query.eq(col, userId)
  if (scope === 'none') return query.eq(col, '00000000-0000-0000-0000-000000000000')
  return query
}
