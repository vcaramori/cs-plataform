import { SupabaseClient } from '@supabase/supabase-js'
import { getPortfolioSummary } from './risk-engine'

/**
 * Camada de agregação de adoção no nível de PORTFÓLIO (não por conta).
 *
 * Diferente de getAccountPlanSummary/AdoptionExecutiveSection — que vivem dentro
 * da ficha da conta — esta função agrega o estado de adoção de todas as contas,
 * quebrado por plano (Basic / Essential / Professional ...), para alimentar o
 * dashboard de Adoção. Não há forecast por IA aqui (isso permanece por conta).
 */

type AdoptionStatus = 'not_started' | 'partial' | 'in_use' | 'blocked' | 'na'

export interface PlanFeatureRank {
  feature: string
  module: string | null
  pct: number
  /** apenas em top_not_adopted: feature exclusiva deste tier (ausente no tier_rank-1) */
  is_differentiator?: boolean
}

export interface PlanAdoption {
  plan_id: string
  plan_name: string
  tier_rank: number
  account_count: number
  adoption_score: number // 0-100, mesma fórmula do "Score de Adoção Real"
  status_counts: {
    in_use: number
    partial: number
    blocked: number
    na: number
    not_started: number
  }
  top_adopted: PlanFeatureRank[]
  top_not_adopted: PlanFeatureRank[]
}

export interface PortfolioAdoption {
  kpis: {
    avg_adoption_score: number
    features_in_use_pct: number
    blocked_pct: number
    downgrade_risk_count: number
    total_accounts: number
  }
  plans: PlanAdoption[]
  blockers_by_category: Array<{ category: string; count: number }>
  downgrade_risks: Array<{ name: string; plan: string; risk: string; features: string[] }>
}

const NOT_ADOPTED_STATUSES: AdoptionStatus[] = ['not_started', 'blocked', 'na']

function emptyPortfolio(total = 0): PortfolioAdoption {
  return {
    kpis: {
      avg_adoption_score: 0,
      features_in_use_pct: 0,
      blocked_pct: 0,
      downgrade_risk_count: 0,
      total_accounts: total,
    },
    plans: [],
    blockers_by_category: [],
    downgrade_risks: [],
  }
}

export async function getPortfolioAdoption(
  supabase: SupabaseClient
): Promise<PortfolioAdoption> {
  // 1. Agregados de portfólio já existentes (blockers, downgrade risk)
  const portfolio = await getPortfolioSummary(supabase)

  // 2. Carrega tudo em poucas queries e agrega em memória
  const [
    { data: plans },
    { data: planFeatures },
    { data: adoption },
    { data: contracts },
    { data: accountPlans },
  ] = await Promise.all([
    supabase
      .from('subscription_plans')
      .select('id, name, tier_rank')
      .eq('is_active', true)
      .order('tier_rank', { ascending: true }),
    supabase
      .from('plan_features')
      .select('plan_id, feature_id, is_included_in_plan, product_features(name, module)')
      .eq('is_included_in_plan', true),
    supabase
      .from('feature_adoption')
      .select('account_id, feature_id, status'),
    supabase
      .from('contracts')
      .select('account_id, service_type, status'),
    supabase
      .from('account_plans')
      .select('account_id, is_active, subscription_plans(id, name, tier_rank)'),
  ])

  if (!plans || plans.length === 0) {
    return { ...emptyPortfolio(portfolio.total_accounts), blockers_by_category: portfolio.top_blockers, downgrade_risks: portfolio.top_downgrade_risks }
  }

  const planById = new Map(plans.map((p: any) => [p.id, p]))
  const planByName = new Map(plans.map((p: any) => [p.name, p]))

  // 2a. Mapa conta -> plano (mesma precedência de getAccountPlanSummary:
  // contrato ativo > qualquer contrato > account_plans)
  const accountPlanId = new Map<string, string>()
  // account_plans como fallback de menor prioridade
  for (const ap of (accountPlans as any[]) ?? []) {
    const sp = ap.subscription_plans
    if (ap.is_active !== false && sp && planById.has(sp.id) && !accountPlanId.has(ap.account_id)) {
      accountPlanId.set(ap.account_id, sp.id)
    }
  }
  // contratos têm prioridade — ativos primeiro
  const sortedContracts = [...((contracts as any[]) ?? [])].sort((a, b) =>
    (a.status === 'active' ? 0 : 1) - (b.status === 'active' ? 0 : 1)
  )
  for (const c of sortedContracts) {
    const plan = planByName.get(c.service_type)
    if (!plan) continue
    if (c.status === 'active') {
      accountPlanId.set(c.account_id, plan.id) // ativo sobrescreve qualquer coisa
    } else if (!accountPlanId.has(c.account_id)) {
      accountPlanId.set(c.account_id, plan.id)
    }
  }

  // 2b. plan_id -> Set(feature_id) e metadados da feature
  const planFeatureIds = new Map<string, Set<string>>()
  const featureMeta = new Map<string, { name: string; module: string | null }>()
  for (const pf of (planFeatures as any[]) ?? []) {
    if (!planFeatureIds.has(pf.plan_id)) planFeatureIds.set(pf.plan_id, new Set())
    planFeatureIds.get(pf.plan_id)!.add(pf.feature_id)
    if (pf.product_features) {
      featureMeta.set(pf.feature_id, {
        name: pf.product_features.name,
        module: pf.product_features.module ?? null,
      })
    }
  }

  // 2c. Índice de adoção por conta
  const adoptionByAccount = new Map<string, Array<{ feature_id: string; status: AdoptionStatus }>>()
  for (const a of (adoption as any[]) ?? []) {
    if (!adoptionByAccount.has(a.account_id)) adoptionByAccount.set(a.account_id, [])
    adoptionByAccount.get(a.account_id)!.push({ feature_id: a.feature_id, status: a.status })
  }

  // 3. Agrega por plano
  const sortedPlans = [...plans].sort((a: any, b: any) => a.tier_rank - b.tier_rank)
  const planAdoptions: PlanAdoption[] = sortedPlans.map((plan: any) => {
    const featureIds = planFeatureIds.get(plan.id) ?? new Set<string>()
    const accountsOnPlan = [...accountPlanId.entries()]
      .filter(([, pid]) => pid === plan.id)
      .map(([accId]) => accId)

    // diferenciadores: features deste plano ausentes no tier imediatamente inferior
    const lowerPlan = sortedPlans.find((p: any) => p.tier_rank === plan.tier_rank - 1)
    const lowerIds = lowerPlan ? planFeatureIds.get(lowerPlan.id) ?? new Set<string>() : new Set<string>()

    const status_counts = { in_use: 0, partial: 0, blocked: 0, na: 0, not_started: 0 }
    // por feature: contagem de status entre as contas do plano
    const perFeature = new Map<string, { total: number; in_use: number; not_adopted: number }>()

    for (const accId of accountsOnPlan) {
      const recs = (adoptionByAccount.get(accId) ?? []).filter(r => featureIds.has(r.feature_id))
      for (const r of recs) {
        if (r.status in status_counts) status_counts[r.status]++
        const f = perFeature.get(r.feature_id) ?? { total: 0, in_use: 0, not_adopted: 0 }
        f.total++
        if (r.status === 'in_use') f.in_use++
        if (NOT_ADOPTED_STATUSES.includes(r.status)) f.not_adopted++
        perFeature.set(r.feature_id, f)
      }
    }

    const totalRecords = Object.values(status_counts).reduce((s, n) => s + n, 0)
    const applicable = totalRecords - status_counts.na
    const adoption_score = applicable > 0
      ? Math.round(((status_counts.in_use + status_counts.partial * 0.5) / applicable) * 100)
      : 0

    const ranked = [...perFeature.entries()].map(([fid, c]) => ({
      fid,
      name: featureMeta.get(fid)?.name ?? 'Feature',
      module: featureMeta.get(fid)?.module ?? null,
      adopted_pct: c.total > 0 ? Math.round((c.in_use / c.total) * 100) : 0,
      not_adopted_pct: c.total > 0 ? Math.round((c.not_adopted / c.total) * 100) : 0,
    }))

    const top_adopted: PlanFeatureRank[] = ranked
      .filter(r => r.adopted_pct > 0)
      .sort((a, b) => b.adopted_pct - a.adopted_pct)
      .slice(0, 5)
      .map(r => ({ feature: r.name, module: r.module, pct: r.adopted_pct }))

    const top_not_adopted: PlanFeatureRank[] = ranked
      .filter(r => r.not_adopted_pct > 0)
      .sort((a, b) => b.not_adopted_pct - a.not_adopted_pct)
      .slice(0, 5)
      .map(r => ({
        feature: r.name,
        module: r.module,
        pct: r.not_adopted_pct,
        is_differentiator: !lowerIds.has(r.fid),
      }))

    return {
      plan_id: plan.id,
      plan_name: plan.name,
      tier_rank: plan.tier_rank,
      account_count: accountsOnPlan.length,
      adoption_score,
      status_counts,
      top_adopted,
      top_not_adopted,
    }
  })

  // 4. KPIs de portfólio
  const totalsAcrossPlans = planAdoptions.reduce(
    (acc, p) => {
      acc.in_use += p.status_counts.in_use
      acc.partial += p.status_counts.partial
      acc.blocked += p.status_counts.blocked
      acc.na += p.status_counts.na
      acc.not_started += p.status_counts.not_started
      return acc
    },
    { in_use: 0, partial: 0, blocked: 0, na: 0, not_started: 0 }
  )
  const grandTotal = Object.values(totalsAcrossPlans).reduce((s, n) => s + n, 0)
  const applicableTotal = grandTotal - totalsAcrossPlans.na

  const plansWithAccounts = planAdoptions.filter(p => p.account_count > 0)
  const avg_adoption_score = plansWithAccounts.length > 0
    ? Math.round(plansWithAccounts.reduce((s, p) => s + p.adoption_score, 0) / plansWithAccounts.length)
    : 0

  return {
    kpis: {
      avg_adoption_score,
      features_in_use_pct: applicableTotal > 0 ? Math.round((totalsAcrossPlans.in_use / applicableTotal) * 100) : 0,
      blocked_pct: grandTotal > 0 ? Math.round((totalsAcrossPlans.blocked / grandTotal) * 100) : 0,
      downgrade_risk_count: portfolio.top_downgrade_risks.filter(r => r.risk !== 'none').length,
      total_accounts: portfolio.total_accounts,
    },
    plans: planAdoptions,
    blockers_by_category: portfolio.top_blockers,
    downgrade_risks: portfolio.top_downgrade_risks,
  }
}
