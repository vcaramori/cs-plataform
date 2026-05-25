import { SupabaseClient } from '@supabase/supabase-js'

export interface PlanSummary {
  plan_name: string
  risk_level: 'high' | 'low' | 'none'
  at_risk_features: string[]
}

export async function getAccountPlanSummary(
  accountId: string,
  supabase: SupabaseClient
): Promise<PlanSummary> {
  // 1. Get current plan info
  const { data: accountPlan } = await supabase
    .from('account_plans')
    .select(`
      subscription_plans (
        id,
        name,
        tier_rank
      )
    `)
    .eq('account_id', accountId)
    .single()

  const currentPlan = (accountPlan as any)?.subscription_plans

  const summary: PlanSummary = {
    plan_name: currentPlan?.name || 'Nenhum plano',
    risk_level: 'none',
    at_risk_features: []
  }

  if (!currentPlan || currentPlan.tier_rank <= 1) {
    return summary
  }

  // 2. Fetch adoption
  const { data: adoption } = await supabase
    .from('feature_adoption')
    .select('feature_id, status, product_features(name)')
    .eq('account_id', accountId)

  // 3. Find the immediate lower plan
  const { data: lowerPlan } = await supabase
    .from('subscription_plans')
    .select('id')
    .eq('tier_rank', currentPlan.tier_rank - 1)
    .single()

  if (lowerPlan) {
    // Get features in current vs lower plan
    const { data: currentFeatures } = await supabase
      .from('plan_features')
      .select('feature_id')
      .eq('plan_id', currentPlan.id)

    const { data: lowerFeatures } = await supabase
      .from('plan_features')
      .select('feature_id')
      .eq('plan_id', lowerPlan.id)

    const currentIds = new Set(currentFeatures?.map(f => f.feature_id) || [])
    const lowerIds = new Set(lowerFeatures?.map(f => f.feature_id) || [])

    // Differentiators: Features in current PLan NOT in lower plan
    const differentiatorIds = [...currentIds].filter(id => !lowerIds.has(id))
    
    const differentiatorsAdoption = adoption?.filter(a => differentiatorIds.includes(a.feature_id)) || []
    
    const lowAdoption = differentiatorsAdoption.filter(a => ['not_started', 'blocked', 'na'].includes(a.status))
    const partialAdoption = differentiatorsAdoption.filter(a => a.status === 'partial')

    if (lowAdoption.length > 0) {
      summary.risk_level = 'high'
      summary.at_risk_features = lowAdoption.map((a: any) => a.product_features?.name).filter(Boolean)
    } else if (partialAdoption.length > 0) {
      summary.risk_level = 'low'
      summary.at_risk_features = partialAdoption.map((a: any) => a.product_features?.name).filter(Boolean)
    }
  }

  return summary
}

export interface PortfolioSummary {
  avg_health: number
  total_accounts: number
  health_dist: { healthy: number; attention: number; risk: number }
  top_downgrade_risks: Array<{ name: string; plan: string; risk: string; features: string[] }>
  top_blockers: Array<{ category: string; count: number }>
  at_risk_accounts: Array<{ name: string; health_score: number; risk_reason: string }>
}

export async function getPortfolioSummary(
  supabase: SupabaseClient
): Promise<PortfolioSummary> {
  const { data: accounts } = await supabase
    .from('accounts')
    .select(`
      id,
      name,
      health_score,
      account_plans (
        subscription_plans (
          id,
          name,
          tier_rank
        )
      )
    `)

  if (!accounts || accounts.length === 0) {
    return {
      avg_health: 0,
      total_accounts: 0,
      health_dist: { healthy: 0, attention: 0, risk: 0 },
      top_downgrade_risks: [],
      top_blockers: []
    }
  }

  const total = accounts.length
  const avgHealth = accounts.reduce((sum, a) => sum + Number(a.health_score), 0) / total

  const health_dist = {
    healthy: accounts.filter(a => a.health_score >= 70).length,
    attention: accounts.filter(a => a.health_score >= 40 && a.health_score < 70).length,
    risk: accounts.filter(a => a.health_score < 40).length
  }

  // Calculate Downgrade Risk for each account with a plan > 1
  const riskTasks = accounts
    .filter(a => {
      const plan = (a.account_plans as any)?.[0]?.subscription_plans
      return plan && plan.tier_rank > 1
    })
    .map(async (a) => {
      const risk = await getAccountPlanSummary(a.id, supabase)
      return {
        name: a.name,
        plan: risk.plan_name,
        risk: risk.risk_level,
        features: risk.at_risk_features
      }
    })

  const allRisks = await Promise.all(riskTasks)
  const topDowngradeRisks = allRisks
    .filter(r => r.risk !== 'none')
    .sort((a, b) => (a.risk === 'high' ? -1 : 1))
    .slice(0, 5)

  // Clientes em risco: health < 40 OU flagados pela IA em account_risk_assessments
  const healthRiskAccounts = accounts
    .filter(a => Number(a.health_score) < 40)
    .map(a => ({ name: a.name, health_score: Number(a.health_score), risk_reason: 'Health Score Crítico (<40)' }))

  const { data: riskRows } = await (supabase as any)
    .from('account_risk_assessments')
    .select('account_id, risk_score, sentiment_label')
    .or('risk_score.gte.80,sentiment_label.in.(at-risk,negative)')

  const healthRiskIds = new Set(accounts.filter(a => Number(a.health_score) < 40).map(a => a.id))
  const aiRiskAccounts = (accounts as any[])
    .filter(a => {
      if (healthRiskIds.has(a.id)) return false // já incluso acima
      return (riskRows || []).some((r: any) => r.account_id === a.id)
    })
    .map(a => {
      const assessment = (riskRows || []).find((r: any) => r.account_id === a.id)
      return {
        name: a.name,
        health_score: Number(a.health_score),
        risk_reason: `Avaliação IA — score: ${assessment?.risk_score ?? 'N/A'} | sentimento: ${assessment?.sentiment_label ?? 'N/A'}`
      }
    })

  const at_risk_accounts = [...healthRiskAccounts, ...aiRiskAccounts]
    .sort((a, b) => a.health_score - b.health_score)

  // Top Blockers
  const { data: blockers } = await supabase
    .from('feature_adoption')
    .select('blocker_category')
    .not('blocker_category', 'is', null)
    .eq('status', 'blocked')

  const blockerMap: Record<string, number> = {}
  blockers?.forEach(b => {
    blockerMap[b.blocker_category] = (blockerMap[b.blocker_category] || 0) + 1
  })

  const topBlockers = Object.entries(blockerMap)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 5)

  return {
    avg_health: Math.round(avgHealth),
    total_accounts: total,
    health_dist,
    top_downgrade_risks: topDowngradeRisks,
    top_blockers: topBlockers,
    at_risk_accounts,
  }
}

