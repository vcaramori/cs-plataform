import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export interface AccountDemand {
  account_id: string
  account_name: string
  arr: number
  segment: string | null
}

export interface DemandSummary {
  accounts: number
  arr: number
  segments: string[]
  accounts_list: AccountDemand[]
}

/**
 * Demanda agregada de uma oportunidade a partir dos sinais linkados:
 * contas distintas, ARR somado (coalesce(arr, mrr*12) de contratos ativos) e segmentos.
 * Espelho de `src/lib/wishlist/demand.ts` para `opportunity_signals`/`opportunity_items`.
 */
export async function computeItemDemand(itemId: string): Promise<DemandSummary> {
  const db = getSupabaseAdminClient() as any

  const { data: signals } = await db
    .from('opportunity_signals')
    .select('account_id')
    .eq('item_id', itemId)

  const accountIds = Array.from(new Set((signals ?? []).map((s: any) => s.account_id).filter(Boolean)))
  if (accountIds.length === 0) return { accounts: 0, arr: 0, segments: [], accounts_list: [] }

  const { data: accounts } = await db
    .from('accounts')
    .select('id, name, segment')
    .in('id', accountIds)

  const { data: contracts } = await db
    .from('contracts')
    .select('account_id, arr, mrr, status')
    .in('account_id', accountIds)

  const arrByAccount = new Map<string, number>()
  for (const c of contracts ?? []) {
    const status = String(c.status ?? '').toLowerCase()
    if (status && status !== 'active' && status !== 'ativo') continue
    const value = c.arr != null ? Number(c.arr) : Number(c.mrr ?? 0) * 12
    arrByAccount.set(c.account_id, (arrByAccount.get(c.account_id) ?? 0) + (isFinite(value) ? value : 0))
  }

  const accounts_list: AccountDemand[] = (accounts ?? []).map((a: any) => ({
    account_id: a.id,
    account_name: a.name,
    arr: arrByAccount.get(a.id) ?? 0,
    segment: a.segment ?? null,
  }))

  const arr = accounts_list.reduce((sum, a) => sum + a.arr, 0)
  const segments = Array.from(new Set(accounts_list.map((a) => a.segment).filter(Boolean))) as string[]

  return { accounts: accounts_list.length, arr, segments, accounts_list }
}

/** Recalcula e persiste em opportunity_items.demand_accounts / demand_arr. */
export async function recomputeItemDemand(itemId: string): Promise<DemandSummary> {
  const summary = await computeItemDemand(itemId)
  const db = getSupabaseAdminClient() as any
  await db
    .from('opportunity_items')
    .update({ demand_accounts: summary.accounts, demand_arr: summary.arr, updated_at: new Date().toISOString() })
    .eq('id', itemId)
  return summary
}
