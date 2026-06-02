import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type PortalAccount = { id: string; name: string; logo_url: string | null }

/**
 * Resolve as contas que um usuário externo (portal) pode ver: todas onde ele é
 * stakeholder (linha em `contacts` com seu e-mail, não `departed`) + fallback
 * legado (`profiles.account_id`). Usa admin client (service-role) porque a RLS de
 * `accounts` é escopada a usuários internos.
 */
export async function getPortalAccounts(
  email: string | undefined | null,
  fallbackAccountId?: string | null
): Promise<PortalAccount[]> {
  const db = getSupabaseAdminClient() as any
  const ids = new Set<string>()

  if (email) {
    const { data: contacts } = await db
      .from('contacts')
      .select('account_id')
      .ilike('email', email)
      .is('departed_at', null)
    for (const c of contacts ?? []) if (c.account_id) ids.add(c.account_id)
  }
  if (fallbackAccountId) ids.add(fallbackAccountId)
  if (ids.size === 0) return []

  const { data: accounts } = await db
    .from('accounts')
    .select('id, name, logo_url')
    .in('id', Array.from(ids))
    .order('name')

  return (accounts ?? []) as PortalAccount[]
}
