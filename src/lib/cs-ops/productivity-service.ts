import type { SupabaseClient } from '@supabase/supabase-js'

/**
 * Serviço de Produtividade da Equipe de CS.
 *
 * Calcula, a partir das tabelas-fonte reais (sem placeholders), indicadores
 * de produtividade por pessoa e agregados do time, organizados em 4 pilares:
 *   A. Esforço & Engajamento  (time_entries, interactions)
 *   B. Atividades & Throughput (csm_tasks)
 *   C. Suporte & Responsividade (support_tickets, csat_responses)
 *   D. Resultados & Outcomes   (contracts, accounts, health_scores, nps_responses)
 *
 * Indicador sem fonte de dado no período fica `null` (oculto na UI), nunca chumbado.
 */

const TEAM_ROLES = ['csm', 'csm_senior', 'account_manager', 'admin']
const INTERNAL_ACTIVITY = ['preparation', 'internal-meeting', 'strategy']
const WEEKLY_HOURS = 40

export type ProductivityPeriod = 'week' | 'month' | 'quarter'

export interface PersonProductivity {
  csmId: string
  csmName: string
  avatarUrl: string | null
  load: {
    accountsManaged: number
    totalMrr: number
    totalArr: number
    utilizationPct: number
    workloadStatus: 'underutilized' | 'balanced' | 'at_capacity' | 'overloaded'
  }
  effort: {
    hoursTotal: number
    hoursWeeklyAvg: number
    billablePct: number
    coveragePct: number
    touchpoints: number
    touchpointsPerAccount: number
  }
  throughput: {
    tasksCompleted: number
    onTimePct: number | null
    avgCycleTimeDays: number | null
    overdueBacklog: number
  }
  support: {
    ticketsResolved: number
    avgFirstResponseHours: number | null
    avgResolutionDays: number | null
    slaCompliancePct: number | null
    avgCsat: number | null
    csatCount: number
  }
  outcomes: {
    renewalsClosed: number
    churnedAccounts: number
    expansionDeals: number
    expansionValue: number
    avgHealth: number
    healthImprovements: number
    healthRegressions: number
    avgNps: number | null
    npsCount: number
  }
  productivityScore: number
  burnout: {
    score: number
    flagged: boolean
    indicators: string[]
  }
}

export interface TeamProductivity {
  period: ProductivityPeriod
  periodStart: string
  periodEnd: string
  weeksInPeriod: number
  teamSize: number
  totals: {
    hoursTotal: number
    tasksCompleted: number
    ticketsResolved: number
    expansionValue: number
    renewalsClosed: number
    churnedAccounts: number
  }
  averages: {
    billablePct: number
    onTimePct: number | null
    slaCompliancePct: number | null
    avgCsat: number | null
    avgHealth: number
    productivityScore: number
    utilizationPct: number
  }
  people: PersonProductivity[]
}

export class ProductivityService {
  private supabase: any

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient as any
  }

  /** Resolve um período nominal em datas ISO [start, end] (inclusive). */
  static resolvePeriod(period: ProductivityPeriod, ref = new Date()): { start: string; end: string } {
    const end = new Date(ref)
    const start = new Date(ref)
    if (period === 'week') start.setDate(start.getDate() - 6)
    else if (period === 'month') start.setDate(start.getDate() - 29)
    else start.setDate(start.getDate() - 89) // quarter ~ 90 dias
    return { start: toISODate(start), end: toISODate(end) }
  }

  async getTeamProductivity(period: ProductivityPeriod, periodStart: string, periodEnd: string): Promise<TeamProductivity> {
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name, avatar_url, role')
      .in('role', TEAM_ROLES)

    const people = await Promise.all(
      (profiles ?? []).map((p: any) => this.getPersonProductivity(p.id, periodStart, periodEnd, p))
    )

    const weeksInPeriod = weeksBetween(periodStart, periodEnd)
    const teamSize = people.length

    const totals = {
      hoursTotal: round(sum(people.map(p => p.effort.hoursTotal)), 1),
      tasksCompleted: sum(people.map(p => p.throughput.tasksCompleted)),
      ticketsResolved: sum(people.map(p => p.support.ticketsResolved)),
      expansionValue: round(sum(people.map(p => p.outcomes.expansionValue)), 0),
      renewalsClosed: sum(people.map(p => p.outcomes.renewalsClosed)),
      churnedAccounts: sum(people.map(p => p.outcomes.churnedAccounts)),
    }

    const averages = {
      billablePct: avg(people.map(p => p.effort.billablePct)),
      onTimePct: avgNullable(people.map(p => p.throughput.onTimePct)),
      slaCompliancePct: avgNullable(people.map(p => p.support.slaCompliancePct)),
      avgCsat: avgNullable(people.map(p => p.support.avgCsat), 2),
      avgHealth: avg(people.map(p => p.outcomes.avgHealth)),
      productivityScore: avg(people.map(p => p.productivityScore)),
      utilizationPct: avg(people.map(p => p.load.utilizationPct)),
    }

    return {
      period,
      periodStart,
      periodEnd,
      weeksInPeriod,
      teamSize,
      totals,
      averages,
      people: people.sort((a, b) => b.productivityScore - a.productivityScore),
    }
  }

  async getPersonProductivity(
    csmId: string,
    periodStart: string,
    periodEnd: string,
    profileHint?: { full_name?: string; avatar_url?: string | null },
  ): Promise<PersonProductivity> {
    const profile = profileHint ?? (await this.supabase
      .from('profiles')
      .select('full_name, avatar_url')
      .eq('id', csmId)
      .single()).data ?? {}

    const weeks = weeksBetween(periodStart, periodEnd)

    // Contas geridas (base para carga, cobertura, outcomes)
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('id, health_score, contracts(mrr)')
      .eq('csm_owner_id', csmId)

    const accountIds: string[] = (accounts ?? []).map((a: any) => a.id)
    const accountsManaged = accountIds.length
    const totalMrr = (accounts ?? []).reduce(
      (s: number, a: any) => s + (a.contracts?.reduce((x: number, c: any) => x + (c.mrr || 0), 0) || 0), 0)
    const avgHealth = accountsManaged > 0
      ? Math.round((accounts ?? []).reduce((s: number, a: any) => s + (a.health_score || 0), 0) / accountsManaged)
      : 0

    const [effort, throughput, support, outcomes] = await Promise.all([
      this.calcEffort(csmId, accountIds, accountsManaged, periodStart, periodEnd, weeks),
      this.calcThroughput(csmId, periodStart, periodEnd),
      this.calcSupport(csmId, periodStart, periodEnd),
      this.calcOutcomes(csmId, accountIds, periodStart, periodEnd, avgHealth),
    ])

    // Carga / utilização (a partir das horas registradas)
    const utilizationPct = Math.round(Math.min(effort.hoursWeeklyAvg / WEEKLY_HOURS, 2) * 100)
    const workloadStatus =
      utilizationPct > 120 ? 'overloaded'
        : utilizationPct > 100 ? 'at_capacity'
          : utilizationPct > 70 ? 'balanced'
            : 'underutilized'

    const productivityScore = this.composeScore(effort, throughput, support, outcomes)
    const burnout = this.assessBurnout(utilizationPct, throughput, support)

    return {
      csmId,
      csmName: profile.full_name || 'Sem nome',
      avatarUrl: profile.avatar_url ?? null,
      load: {
        accountsManaged,
        totalMrr: round(totalMrr, 0),
        totalArr: round(totalMrr * 12, 0),
        utilizationPct,
        workloadStatus: workloadStatus as PersonProductivity['load']['workloadStatus'],
      },
      effort,
      throughput,
      support,
      outcomes,
      productivityScore,
      burnout,
    }
  }

  // ── Pilar A: Esforço & Engajamento ────────────────────────────────
  private async calcEffort(
    csmId: string, accountIds: string[], accountsManaged: number,
    periodStart: string, periodEnd: string, weeks: number,
  ): Promise<PersonProductivity['effort']> {
    const { data: entries } = await this.supabase
      .from('time_entries')
      .select('parsed_hours, activity_type')
      .eq('csm_id', csmId)
      .gte('date', periodStart)
      .lte('date', periodEnd)

    const hoursTotal = (entries ?? []).reduce((s: number, e: any) => s + (e.parsed_hours || 0), 0)
    const billableHours = (entries ?? [])
      .filter((e: any) => !INTERNAL_ACTIVITY.includes(e.activity_type))
      .reduce((s: number, e: any) => s + (e.parsed_hours || 0), 0)
    const billablePct = hoursTotal > 0 ? Math.round((billableHours / hoursTotal) * 100) : 0

    // Engajamento: interações no período e cobertura da carteira
    const { data: interactions } = await this.supabase
      .from('interactions')
      .select('account_id')
      .eq('csm_id', csmId)
      .gte('date', periodStart)
      .lte('date', periodEnd)

    const touchpoints = (interactions ?? []).length
    const touchedAccounts = new Set((interactions ?? []).map((i: any) => i.account_id))
    const coveredInPortfolio = accountIds.filter(id => touchedAccounts.has(id)).length
    const coveragePct = accountsManaged > 0 ? Math.round((coveredInPortfolio / accountsManaged) * 100) : 0

    return {
      hoursTotal: round(hoursTotal, 1),
      hoursWeeklyAvg: round(weeks > 0 ? hoursTotal / weeks : hoursTotal, 1),
      billablePct,
      coveragePct,
      touchpoints,
      touchpointsPerAccount: round(accountsManaged > 0 ? touchpoints / accountsManaged : 0, 1),
    }
  }

  // ── Pilar B: Atividades & Throughput ──────────────────────────────
  private async calcThroughput(
    csmId: string, periodStart: string, periodEnd: string,
  ): Promise<PersonProductivity['throughput']> {
    const { data: completed } = await this.supabase
      .from('csm_tasks')
      .select('created_at, completed_at, due_date')
      .eq('csm_id', csmId)
      .eq('status', 'completed')
      .gte('completed_at', `${periodStart}T00:00:00`)
      .lte('completed_at', `${periodEnd}T23:59:59`)

    const tasksCompleted = (completed ?? []).length

    const withDue = (completed ?? []).filter((t: any) => t.due_date && t.completed_at)
    const onTime = withDue.filter((t: any) => toISODate(new Date(t.completed_at)) <= t.due_date).length
    const onTimePct = withDue.length > 0 ? Math.round((onTime / withDue.length) * 100) : null

    const cycleDays = (completed ?? [])
      .filter((t: any) => t.created_at && t.completed_at)
      .map((t: any) => (new Date(t.completed_at).getTime() - new Date(t.created_at).getTime()) / 86400000)
    const avgCycleTimeDays = cycleDays.length > 0 ? round(sum(cycleDays) / cycleDays.length, 1) : null

    // Backlog atrasado (ponto no tempo, não limitado ao período)
    const today = toISODate(new Date())
    const { count: overdueBacklog } = await this.supabase
      .from('csm_tasks')
      .select('id', { count: 'exact', head: true })
      .eq('csm_id', csmId)
      .in('status', ['todo', 'in_progress'])
      .not('due_date', 'is', null)
      .lt('due_date', today)

    return { tasksCompleted, onTimePct, avgCycleTimeDays, overdueBacklog: overdueBacklog ?? 0 }
  }

  // ── Pilar C: Suporte & Responsividade ─────────────────────────────
  private async calcSupport(
    csmId: string, periodStart: string, periodEnd: string,
  ): Promise<PersonProductivity['support']> {
    const { data: tickets } = await this.supabase
      .from('support_tickets')
      .select('id, created_at, first_response_at, resolved_at, sla_breach_first_response, sla_breach_resolution')
      .eq('assigned_to', csmId)
      .gte('resolved_at', periodStart)
      .lte('resolved_at', periodEnd)

    const list = tickets ?? []
    const ticketsResolved = list.length

    const frHours = list
      .filter((t: any) => t.first_response_at && t.created_at)
      .map((t: any) => (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 3600000)
      .filter((h: number) => h >= 0)
    const avgFirstResponseHours = frHours.length > 0 ? round(sum(frHours) / frHours.length, 1) : null

    const resDays = list
      .filter((t: any) => t.resolved_at && t.created_at)
      .map((t: any) => (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 86400000)
      .filter((d: number) => d >= 0)
    const avgResolutionDays = resDays.length > 0 ? round(sum(resDays) / resDays.length, 1) : null

    const slaCompliancePct = ticketsResolved > 0
      ? Math.round((list.filter((t: any) => !t.sla_breach_first_response && !t.sla_breach_resolution).length / ticketsResolved) * 100)
      : null

    // CSAT via csat_responses dos tickets atribuídos a este agente
    let avgCsat: number | null = null
    let csatCount = 0
    const ticketIds = list.map((t: any) => t.id)
    if (ticketIds.length > 0) {
      const { data: csat } = await this.supabase
        .from('csat_responses')
        .select('score')
        .in('ticket_id', ticketIds)
      csatCount = (csat ?? []).length
      if (csatCount > 0) {
        avgCsat = round((csat ?? []).reduce((s: number, c: any) => s + (c.score || 0), 0) / csatCount, 2)
      }
    }

    return { ticketsResolved, avgFirstResponseHours, avgResolutionDays, slaCompliancePct, avgCsat, csatCount }
  }

  // ── Pilar D: Resultados & Outcomes ────────────────────────────────
  private async calcOutcomes(
    csmId: string, accountIds: string[], periodStart: string, periodEnd: string, avgHealth: number,
  ): Promise<PersonProductivity['outcomes']> {
    const { data: renewals } = await this.supabase
      .from('contracts')
      .select('id')
      .eq('csm_owner_id', csmId)
      .eq('contract_type', 'renewal')
      .eq('status', 'active')
      .gte('renewal_date', periodStart)
      .lte('renewal_date', periodEnd)

    const { data: churned } = await this.supabase
      .from('contracts')
      .select('id')
      .eq('csm_owner_id', csmId)
      .eq('status', 'churned')
      .gte('renewal_date', periodStart)
      .lte('renewal_date', periodEnd)

    const { data: expansions } = await this.supabase
      .from('contracts')
      .select('mrr')
      .eq('csm_owner_id', csmId)
      .eq('contract_type', 'additive')
      .gte('created_at', `${periodStart}T00:00:00`)
      .lte('created_at', `${periodEnd}T23:59:59`)

    const expansionValue = (expansions ?? []).reduce((s: number, e: any) => s + (e.mrr || 0), 0)

    // Tendência de saúde: compara primeiro vs último score por conta no período
    let healthImprovements = 0
    let healthRegressions = 0
    if (accountIds.length > 0) {
      const { data: hist } = await this.supabase
        .from('health_scores')
        .select('account_id, evaluated_at, manual_score, shadow_score')
        .in('account_id', accountIds)
        .gte('evaluated_at', periodStart)
        .lte('evaluated_at', periodEnd)
        .order('evaluated_at', { ascending: true })

      const byAccount = new Map<string, { first: number; last: number }>()
      for (const h of hist ?? []) {
        const score = (h.manual_score ?? h.shadow_score)
        if (score == null) continue
        const cur = byAccount.get(h.account_id)
        if (!cur) byAccount.set(h.account_id, { first: score, last: score })
        else cur.last = score
      }
      for (const { first, last } of byAccount.values()) {
        if (last > first) healthImprovements++
        else if (last < first) healthRegressions++
      }
    }

    // NPS das contas geridas (nps_responses não tem csm_id — junta via account)
    let avgNps: number | null = null
    let npsCount = 0
    if (accountIds.length > 0) {
      const { data: nps } = await this.supabase
        .from('nps_responses')
        .select('score')
        .in('account_id', accountIds)
        .not('score', 'is', null)
        .gte('responded_at', `${periodStart}T00:00:00`)
        .lte('responded_at', `${periodEnd}T23:59:59`)
      npsCount = (nps ?? []).length
      if (npsCount > 0) {
        avgNps = round((nps ?? []).reduce((s: number, n: any) => s + (n.score || 0), 0) / npsCount, 1)
      }
    }

    return {
      renewalsClosed: (renewals ?? []).length,
      churnedAccounts: (churned ?? []).length,
      expansionDeals: (expansions ?? []).length,
      expansionValue: round(expansionValue, 0),
      avgHealth,
      healthImprovements,
      healthRegressions,
      avgNps,
      npsCount,
    }
  }

  /** Score composto 0-100: média ponderada dos pilares com dado disponível. */
  private composeScore(
    effort: PersonProductivity['effort'],
    throughput: PersonProductivity['throughput'],
    support: PersonProductivity['support'],
    outcomes: PersonProductivity['outcomes'],
  ): number {
    const parts: { value: number; weight: number }[] = []

    // Engajamento: billable% e cobertura
    parts.push({ value: (effort.billablePct + effort.coveragePct) / 2, weight: 0.25 })

    // Throughput: % no prazo (se houver)
    if (throughput.onTimePct != null) parts.push({ value: throughput.onTimePct, weight: 0.25 })

    // Suporte: SLA e CSAT (se houver)
    const supportParts: number[] = []
    if (support.slaCompliancePct != null) supportParts.push(support.slaCompliancePct)
    if (support.avgCsat != null) supportParts.push((support.avgCsat / 5) * 100)
    if (supportParts.length > 0) parts.push({ value: avg(supportParts), weight: 0.25 })

    // Outcomes: saúde média da carteira
    parts.push({ value: outcomes.avgHealth, weight: 0.25 })

    const totalWeight = parts.reduce((s, p) => s + p.weight, 0)
    if (totalWeight === 0) return 0
    return Math.round(parts.reduce((s, p) => s + p.value * p.weight, 0) / totalWeight)
  }

  /** Risco de burnout 0-1 + indicadores. */
  private assessBurnout(
    utilizationPct: number,
    throughput: PersonProductivity['throughput'],
    support: PersonProductivity['support'],
  ): PersonProductivity['burnout'] {
    let score = 0
    const indicators: string[] = []
    if (utilizationPct > 120) { score += 0.3; indicators.push('overutilized') }
    if (throughput.overdueBacklog > 10) { score += 0.2; indicators.push('high_backlog') }
    if (support.slaCompliancePct != null && support.slaCompliancePct < 70) { score += 0.15; indicators.push('low_sla') }
    if (support.avgCsat != null && support.avgCsat < 3.5) { score += 0.15; indicators.push('low_csat') }
    return { score: round(Math.min(score, 1), 2), flagged: score > 0.6, indicators }
  }
}

// ── Helpers ─────────────────────────────────────────────────────────
function toISODate(d: Date): string {
  return d.toISOString().split('T')[0]
}
function weeksBetween(start: string, end: string): number {
  const days = (new Date(end).getTime() - new Date(start).getTime()) / 86400000 + 1
  return Math.max(days / 7, 1)
}
function sum(arr: number[]): number {
  return arr.reduce((s, v) => s + v, 0)
}
function avg(arr: number[], decimals = 0): number {
  if (arr.length === 0) return 0
  return round(sum(arr) / arr.length, decimals)
}
function avgNullable(arr: (number | null)[], decimals = 0): number | null {
  const vals = arr.filter((v): v is number => v != null)
  if (vals.length === 0) return null
  return round(sum(vals) / vals.length, decimals)
}
function round(v: number, decimals = 0): number {
  const f = Math.pow(10, decimals)
  return Math.round(v * f) / f
}
