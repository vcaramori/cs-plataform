import { SupabaseClient } from '@supabase/supabase-js'
import { getNPSSegment } from '@/lib/supabase/types'

/**
 * KPIs de portfólio reutilizados pelo /dashboard (Portfolio Control) e pela
 * /home (cockpit diário). Centraliza a matemática para evitar divergência
 * entre as duas telas. As contas devem vir com `contracts` e
 * `account_risk_assessments` aninhados.
 */

export interface PortfolioKpis {
  totalAccounts: number
  totalActiveContracts: number
  totalMRR: number
  avgHealthScore: number
  atRisk: number
  renewalsSoon: number
}

function toArray<T>(v: T | T[] | null | undefined): T[] {
  return Array.isArray(v) ? v : v ? [v] : []
}

export function computePortfolioKpis(accounts: any[] | null | undefined): PortfolioKpis {
  const safe = accounts ?? []

  const totalMRR = safe.reduce((sum, a) => {
    const activeMRR = toArray<any>(a.contracts)
      .filter(c => c.status === 'active')
      .reduce((s, c) => s + (Number(c.mrr) || 0), 0)
    return sum + activeMRR
  }, 0)

  const atRisk = safe.filter(a => {
    const healthRisk = a.health_score < 40
    const aiRisk = toArray<any>(a.account_risk_assessments).some(
      r => r.risk_score >= 80 || r.sentiment_label === 'at-risk' || r.sentiment_label === 'negative'
    )
    return healthRisk || aiRisk
  }).length

  const avgHealthScore = safe.length
    ? Math.round(safe.reduce((sum, a) => sum + (Number(a.health_score) || 0), 0) / safe.length)
    : 0

  const today = new Date()
  const in90d = new Date(today.getTime() + 90 * 24 * 60 * 60 * 1000)
  const renewalsSoon = safe.filter(a =>
    toArray<any>(a.contracts)
      .filter(c => c.status === 'active')
      .some(c => c.renewal_date && new Date(c.renewal_date) <= in90d)
  ).length

  const totalActiveContracts = safe.reduce(
    (sum, a) => sum + toArray<any>(a.contracts).filter(c => c.status === 'active').length,
    0
  )

  return {
    totalAccounts: safe.length,
    totalActiveContracts,
    totalMRR,
    avgHealthScore,
    atRisk,
    renewalsSoon,
  }
}

/**
 * NPS Score (-100..100) do conjunto de contas informado. Usa o admin client
 * para ler `nps_responses` sem esbarrar em RLS. Retorna null se não houver dados.
 */
export async function computePortfolioNps(
  admin: SupabaseClient,
  accountIds: string[]
): Promise<number | null> {
  if (!accountIds || accountIds.length === 0) return null

  const { data: responses } = await admin
    .from('nps_responses')
    .select('score')
    .in('account_id', accountIds)
    .eq('dismissed', false)
    .not('score', 'is', null)

  if (!responses || responses.length === 0) return null

  let promoters = 0
  let detractors = 0
  for (const r of responses) {
    if (r.score === null) continue
    const seg = getNPSSegment(r.score)
    if (seg === 'promoter') promoters++
    else if (seg === 'detractor') detractors++
  }
  return Math.round(((promoters - detractors) / responses.length) * 100)
}
