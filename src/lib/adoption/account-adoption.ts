import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Fonte ÚNICA de cálculo de adoção por conta, sobre o modelo REAL (`feature_adoption`).
 * Substitui o schema fantasma `account_feature_adoption`/`adoption_status`/`adoption_pct`
 * que o AdoptionService antigo usava. Usa a mesma fórmula do dashboard de portfólio
 * (portfolio-adoption.ts): Score = (in_use + partial·0.5) / (total − na) × 100.
 *
 * As linhas de feature_adoption de uma conta já representam as features do plano
 * (auto-semeadas como 'not_started' ao abrir a aba Adoção — ver /api/accounts/[id]/adoption).
 */

export type AdoptionStatus = 'not_started' | 'partial' | 'in_use' | 'blocked' | 'na'

export interface AccountAdoptionFeature {
  featureId: string
  name: string
  module: string | null
  status: AdoptionStatus
}

export interface AccountAdoptionBlocker {
  featureId: string
  featureName: string
  blockerCategory: string | null
  blockerReason: string | null
  actionPlan: string | null
}

export interface AccountAdoption {
  hasData: boolean
  featuresTotal: number
  featuresAdopted: number // status = in_use
  overallAdoptionPct: number // 0-100
  statusCounts: Record<AdoptionStatus, number>
  features: AccountAdoptionFeature[]
  blockers: AccountAdoptionBlocker[]
}

const VALID: AdoptionStatus[] = ['not_started', 'partial', 'in_use', 'blocked', 'na']

function emptyAdoption(): AccountAdoption {
  return {
    hasData: false,
    featuresTotal: 0,
    featuresAdopted: 0,
    overallAdoptionPct: 0,
    statusCounts: { not_started: 0, partial: 0, in_use: 0, blocked: 0, na: 0 },
    features: [],
    blockers: [],
  }
}

export async function computeAccountAdoption(
  accountId: string,
  supabase: SupabaseClient
): Promise<AccountAdoption> {
  const { data, error } = await supabase
    .from('feature_adoption')
    .select('feature_id, status, blocker_category, blocker_reason, action_plan, product_features(name, module)')
    .eq('account_id', accountId)

  if (error || !data || data.length === 0) return emptyAdoption()

  const result = emptyAdoption()
  result.hasData = true

  for (const row of data as any[]) {
    const status = (VALID.includes(row.status) ? row.status : 'not_started') as AdoptionStatus
    result.statusCounts[status]++
    const name = row.product_features?.name ?? 'Feature'
    const module = row.product_features?.module ?? null
    result.features.push({ featureId: row.feature_id, name, module, status })
    if (status === 'blocked') {
      result.blockers.push({
        featureId: row.feature_id,
        featureName: name,
        blockerCategory: row.blocker_category ?? null,
        blockerReason: row.blocker_reason ?? null,
        actionPlan: row.action_plan ?? null,
      })
    }
  }

  const c = result.statusCounts
  result.featuresTotal = result.features.length
  result.featuresAdopted = c.in_use
  const applicable = result.featuresTotal - c.na
  result.overallAdoptionPct = applicable > 0 ? Math.round(((c.in_use + c.partial * 0.5) / applicable) * 100) : 0

  return result
}
