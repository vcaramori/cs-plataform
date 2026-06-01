import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { HealthBreakdown } from '@/lib/supabase/types'

export type WeightedScoreResult = {
  score: number
  breakdown: HealthBreakdown
  status: 'healthy' | 'at-risk' | 'critical'
}

/**
 * Calculate SLA Score: % of tickets resolved on time in the last 30 days
 * Returns 0-100 where 100 is all tickets resolved within SLA
 * Default: 50 if no resolved tickets
 */
export async function calcSLAScore(accountId: string): Promise<number> {
  const supabase = getSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any // TECH_DEBT #8: schema/tipos ainda divergem neste arquivo

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('support_tickets')
    .select('resolved_at, due_date', { count: 'exact' })
    .eq('account_id', accountId)
    .not('resolved_at', 'is', null)
    .gte('resolved_at', thirtyDaysAgo)

  if (error || !data) {
    console.warn(`[SLA Score] Error for account ${accountId}:`, error?.message)
    return 50.0
  }

  if (data.length === 0) {
    return 50.0
  }

  const onTimeCount = data.filter((ticket: any) => {
    if (!ticket.due_date || !ticket.resolved_at) return false
    const resolved = new Date(ticket.resolved_at).getTime()
    const due = new Date(ticket.due_date).getTime()
    return resolved <= due
  }).length

  const score = (onTimeCount / data.length) * 100
  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100
}

/**
 * Calculate NPS Score: Normalize average NPS from responses to 0-100 scale
 * Formula: (avgNPS + 100) / 2
 * NPS ranges from -100 to 100, normalized to 0-100
 * Default: 50 if no NPS data
 */
export async function calcNPSScore(accountId: string): Promise<number> {
  const supabase = getSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any // TECH_DEBT #8: schema/tipos ainda divergem neste arquivo

  const ninetyDaysAgo = new Date(Date.now() - 90 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('nps_responses')
    .select('score')
    .eq('account_id', accountId)
    .not('score', 'is', null)
    .gte('created_at', ninetyDaysAgo)

  if (error || !data || data.length === 0) {
    console.warn(`[NPS Score] No data for account ${accountId}`)
    return 50.0
  }

  const avgNPS = data.reduce((sum: number, r: any) => sum + (r.score || 0), 0) / data.length
  // Normalize: (avgNPS + 100) / 2 converts -100..100 to 0..100
  const normalized = ((avgNPS + 100) / 2)
  return Math.round(Math.max(0, Math.min(100, normalized)) * 100) / 100
}

/**
 * Calcula o Adoption Score: % de features adotadas sobre o total acompanhado.
 * Fonte real: account_feature_adoption (adoption_status). A tabela
 * adoption_metrics é genérica (metric_name/value) e NÃO guarda esse JSONB —
 * o código antigo lia um shape inexistente e caía sempre no default 50.
 * Retorna 50 quando não há dados de adoção para a conta.
 */
export async function calcAdoptionScore(accountId: string): Promise<number> {
  const supabase = getSupabaseAdminClient()

  // cast: account_feature_adoption ainda não consta em database.types (ver TECH_DEBT #8)
  const { data, error } = await (supabase as any)
    .from('account_feature_adoption')
    .select('adoption_status')
    .eq('account_id', accountId)

  if (error || !data || data.length === 0) {
    console.warn(`[Adoption Score] Sem dados de adoção para a conta ${accountId}`)
    return 50.0
  }

  const total = data.length
  const active = data.filter((r: any) => r.adoption_status === 'adopted').length
  const score = (active / total) * 100
  return Math.round(Math.max(0, Math.min(100, score)) * 100) / 100
}

/**
 * Calculate Relationship Score: Interaction frequency in last 30 days
 * Scoring buckets:
 * - 0 days (no interactions): 0
 * - 1-7 days since last interaction: 100
 * - 8-14 days: 75
 * - 15-21 days: 50
 * - 22-30 days: 25
 * - >30 days: 0
 */
export async function calcRelationshipScore(accountId: string): Promise<number> {
  const supabase = getSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any // TECH_DEBT #8: schema/tipos ainda divergem neste arquivo

  const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

  const { data, error } = await db
    .from('interactions')
    .select('date')
    .eq('account_id', accountId)
    .gte('date', thirtyDaysAgo)
    .order('date', { ascending: false })
    .limit(1)

  if (error || !data || data.length === 0) {
    // No interactions in last 30 days
    return 0
  }

  const lastInteractionDate = new Date(data[0].date).getTime()
  const now = Date.now()
  const daysSinceLastInteraction = Math.floor((now - lastInteractionDate) / (24 * 60 * 60 * 1000))

  let score: number
  if (daysSinceLastInteraction <= 7) {
    score = 100
  } else if (daysSinceLastInteraction <= 14) {
    score = 75
  } else if (daysSinceLastInteraction <= 21) {
    score = 50
  } else if (daysSinceLastInteraction <= 30) {
    score = 25
  } else {
    score = 0
  }

  return score
}

/**
 * Calculate Weighted Health Score v2
 * Weights: SLA 35%, NPS 30%, Adoption 25%, Relationship 10%
 * Classification:
 * - healthy: >= 75
 * - at-risk: 50-74
 * - critical: < 50
 */
export function calcWeightedScore(components: {
  sla: number
  nps: number
  adoption: number
  relationship: number
}): WeightedScoreResult {
  const { sla, nps, adoption, relationship } = components

  // Weighted calculation
  const score = (sla * 0.35) + (nps * 0.30) + (adoption * 0.25) + (relationship * 0.10)
  const finalScore = Math.round(Math.max(0, Math.min(100, score)) * 100) / 100

  // Classification
  let status: 'healthy' | 'at-risk' | 'critical'
  if (finalScore >= 75) {
    status = 'healthy'
  } else if (finalScore >= 50) {
    status = 'at-risk'
  } else {
    status = 'critical'
  }

  return {
    score: finalScore,
    breakdown: {
      sla,
      nps,
      adoption,
      relationship
    },
    status
  }
}

/**
 * Calculate all weighted scores for an account and return complete result
 * This is the main orchestration function used by cron jobs
 */
export async function calculateCompleteHealthScore(accountId: string): Promise<WeightedScoreResult> {
  const [sla, nps, adoption, relationship] = await Promise.all([
    calcSLAScore(accountId),
    calcNPSScore(accountId),
    calcAdoptionScore(accountId),
    calcRelationshipScore(accountId)
  ])

  return calcWeightedScore({ sla, nps, adoption, relationship })
}
