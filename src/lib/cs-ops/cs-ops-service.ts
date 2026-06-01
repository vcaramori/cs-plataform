import type { SupabaseClient } from '@supabase/supabase-js'

export class CSOperationsService {
  private supabase: any

  constructor(supabaseClient: SupabaseClient) {
    this.supabase = supabaseClient as any
  }

  /**
   * Calculate CSM capacity and workload metrics
   */
  async calculateCapacity(csmId: string) {
    // Get CSM profile
    const { data: profile } = await this.supabase
      .from('profiles')
      .select('id, full_name')
      .eq('id', csmId)
      .single()

    // Get accounts managed
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('id, health_score, contracts(mrr)')
      .eq('csm_owner_id', csmId)

    const accountsManaged = accounts?.length || 0
    const totalMrr = (accounts || []).reduce((sum: number, a: any) => {
      const accountMrr = a.contracts?.reduce((s: number, c: any) => s + (c.mrr || 0), 0) || 0
      return sum + accountMrr
    }, 0)

    const avgHealthScore =
      accountsManaged > 0
        ? Math.round(
            (accounts || []).reduce((sum: number, a: any) => sum + (a.health_score || 0), 0) / accountsManaged
          )
        : 0

    // Get time entries for billable hours
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const { data: timeEntries } = await this.supabase
      .from('time_entries')
      .select('parsed_hours, activity_type')
      .eq('csm_id', csmId)
      .gte('date', thirtyDaysAgo.toISOString().split('T')[0])

    // Calculate billable vs internal hours
    const hoursBillable =
      (timeEntries || [])
        .filter((t: any) => !['preparation', 'internal-meeting', 'strategy'].includes(t.activity_type))
        .reduce((sum: number, t: any) => sum + (t.parsed_hours || 0), 0) / 4 || 0 // Average to weekly

    const hoursInternal =
      (timeEntries || [])
        .filter((t: any) => ['preparation', 'internal-meeting', 'strategy'].includes(t.activity_type))
        .reduce((sum: number, t: any) => sum + (t.parsed_hours || 0), 0) / 4 || 0 // Average to weekly

    const hoursAllocatedWeekly = 40
    const capacityUtilizationPct = Math.min((hoursBillable + hoursInternal) / hoursAllocatedWeekly, 2) * 100
    const billableUtilizationPct = (hoursBillable / hoursAllocatedWeekly) * 100

    const workloadStatus =
      capacityUtilizationPct > 120
        ? 'overloaded'
        : capacityUtilizationPct > 100
          ? 'at_capacity'
          : capacityUtilizationPct > 70
            ? 'balanced'
            : 'underutilized'

    return {
      csmId,
      csmName: profile?.full_name || 'Unknown',
      snapshotDate: new Date().toISOString().split('T')[0],
      accountsManaged,
      totalMrr,
      totalArr: totalMrr * 12,
      avgHealthScore,
      capacityUtilizationPct: Math.round(capacityUtilizationPct),
      workloadStatus,
      hoursAllocatedWeekly,
      hoursBillableWeekly: Math.round(hoursBillable * 100) / 100,
      hoursInternalWeekly: Math.round(hoursInternal * 100) / 100,
      billableUtilizationPct: Math.round(billableUtilizationPct),
    }
  }

  /**
   * Suggest territory rebalancing based on workload
   */
  async suggestRebalancing() {
    // Get all CSM capacity metrics
    const { data: profiles } = await this.supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['csm', 'csm_senior', 'account_manager', 'admin'])

    if (!profiles || profiles.length === 0) {
      return { suggestions: [], summary: { totalSuggestions: 0, potentialCapacityImprovement: 0 } }
    }

    const capacityMetrics = await Promise.all(
      profiles.map((p) => this.calculateCapacity(p.id))
    )

    // Find overloaded CSMs with accounts to move
    const overloadedCsms = capacityMetrics.filter((m) => m.capacityUtilizationPct > 120)
    const underutilizedCsms = capacityMetrics.filter((m) => m.capacityUtilizationPct < 70)

    const suggestions = []

    // For each overloaded CSM, find accounts that could be reassigned
    for (const overloadedCsm of overloadedCsms) {
      const { data: accounts } = await this.supabase
        .from('accounts')
        .select('id, name, health_score, contracts(mrr)')
        .eq('csm_owner_id', overloadedCsm.csmId)
        .order('health_score', { ascending: true }) // Lowest health first (easier to handoff)
        .limit(3)

      for (const account of accounts || []) {
        // Find best target CSM
        const bestTarget = underutilizedCsms[0]
        if (!bestTarget) continue

        const accountMrr = account.contracts?.reduce((sum: number, c: any) => sum + (c.mrr || 0), 0) || 0

        // Calculate what utilization would look like after move
        const fromUtilizationAfter =
          ((overloadedCsm.hoursBillableWeekly * (overloadedCsm.accountsManaged - 1)) /
            overloadedCsm.accountsManaged /
            40) *
          100
        const toUtilizationAfter =
          ((bestTarget.hoursBillableWeekly + bestTarget.hoursBillableWeekly / bestTarget.accountsManaged) / 40) * 100

        const recommendationScore = Math.min(
          (overloadedCsm.capacityUtilizationPct - 100) / 100,
          (100 - toUtilizationAfter) / 100
        )

        suggestions.push({
          suggestionId: Math.random().toString(36).substr(2, 9),
          accountId: account.id,
          accountName: account.name,
          currentCsmId: overloadedCsm.csmId,
          currentCsmName: overloadedCsm.csmName,
          suggestedCsmId: bestTarget.csmId,
          suggestedCsmName: bestTarget.csmName,
          recommendationScore: Math.min(Math.max(recommendationScore, 0), 1),
          rationale: `Rebalance ${account.name} (${accountMrr} MRR) from ${overloadedCsm.csmName} (${overloadedCsm.capacityUtilizationPct}% util.) to ${bestTarget.csmName} (${bestTarget.capacityUtilizationPct}% util.)`,
          currentCsmUtilizationAfter: Math.round(fromUtilizationAfter),
          suggestedCsmUtilizationAfter: Math.round(toUtilizationAfter),
          expectedImpact: {
            currentCsmImpact:
              fromUtilizationAfter > 100
                ? 'reduce_overload'
                : fromUtilizationAfter > 80
                  ? 'optimize'
                  : 'utilize_better',
            suggestedCsmImpact:
              toUtilizationAfter > 100
                ? 'increase_capacity'
                : toUtilizationAfter > 80
                  ? 'balance'
                  : 'utilize_better',
          },
        })
      }
    }

    return {
      suggestions: suggestions.sort((a, b) => b.recommendationScore - a.recommendationScore),
      summary: {
        totalSuggestions: suggestions.length,
        potentialCapacityImprovement: suggestions.length > 0 ? Math.min(suggestions.length / overloadedCsms.length, 1) : 0,
      },
    }
  }

  /**
   * Calculate CSM health and burnout risk
   */
  async calculateHealth(csmId: string) {
    const capacity = await this.calculateCapacity(csmId)

    // Get recent customer satisfaction scores
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000)
    const thirtyDaysAgoIso = thirtyDaysAgo.toISOString()

    // NPS — nps_responses não tem csm_id; junta pelas contas do CSM
    const { data: ownedAccounts } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('csm_owner_id', csmId)
    const ownedAccountIds = (ownedAccounts || []).map((a: any) => a.id)

    let avgNps = 0
    if (ownedAccountIds.length > 0) {
      const { data: npsScores } = await this.supabase
        .from('nps_responses')
        .select('score')
        .in('account_id', ownedAccountIds)
        .not('score', 'is', null)
        .gte('responded_at', thirtyDaysAgoIso)
      avgNps = npsScores && npsScores.length > 0
        ? npsScores.reduce((sum: number, n: any) => sum + (n.score || 0), 0) / npsScores.length
        : 0
    }

    // Tickets resolvidos pelo agente nos últimos 30 dias (assigned_to)
    const { data: agentTickets } = await this.supabase
      .from('support_tickets')
      .select('id, sla_breach_resolution, created_at, first_response_at')
      .eq('assigned_to', csmId)
      .gte('resolved_at', thirtyDaysAgoIso.split('T')[0])

    const agentTicketIds = (agentTickets || []).map((t: any) => t.id)

    // Tempo médio até 1ª resposta (horas) — real, a partir dos tickets do agente
    const responseHours = (agentTickets || [])
      .filter((t: any) => t.first_response_at && t.created_at)
      .map((t: any) => (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 3600000)
      .filter((h: number) => h >= 0)
    const avgResponseTimeHours = responseHours.length > 0
      ? Math.round((responseHours.reduce((s: number, h: number) => s + h, 0) / responseHours.length) * 10) / 10
      : 0

    // CSAT via csat_responses dos tickets do agente
    let avgCsat = 0
    if (agentTicketIds.length > 0) {
      const { data: csatScores } = await this.supabase
        .from('csat_responses')
        .select('score')
        .in('ticket_id', agentTicketIds)
      avgCsat = csatScores && csatScores.length > 0
        ? csatScores.reduce((sum: number, c: any) => sum + (c.score || 0), 0) / csatScores.length
        : 0
    }

    // "Escalações" como proxy: tickets do agente com quebra de SLA de resolução
    const escalations = (agentTickets || []).filter((t: any) => t.sla_breach_resolution)

    // Calculate burnout risk score
    let burnoutRiskScore = 0
    const indicators = []

    if (capacity.capacityUtilizationPct > 120) {
      burnoutRiskScore += 0.3
      indicators.push('overutilized')
    }

    if ((escalations?.length || 0) > 5) {
      burnoutRiskScore += 0.2
      indicators.push('high_escalations')
    }

    if (avgCsat < 3.5) {
      burnoutRiskScore += 0.15
      indicators.push('low_csat')
    }

    if (avgNps < 0) {
      burnoutRiskScore += 0.15
      indicators.push('high_stress_signals')
    }

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', csmId)
      .single()

    return {
      csmId,
      csmName: profile?.full_name || 'Unknown',
      snapshotDate: new Date().toISOString().split('T')[0],
      utilizationPct: capacity.capacityUtilizationPct,
      avgResponseTimeHours,
      escalationsOwned: escalations?.length || 0,
      avgCsatScore: Math.round(avgCsat * 100) / 100,
      avgNpsTeam: Math.round(avgNps * 10) / 10,
      burnoutRiskScore: Math.min(Math.round(burnoutRiskScore * 100) / 100, 1),
      burnoutIndicators: indicators,
      flaggedAsHighRisk: burnoutRiskScore > 0.7,
      recommendations:
        burnoutRiskScore > 0.7
          ? ['Consider workload reduction', 'Review account assignments', 'Schedule 1:1 check-in']
          : [],
    }
  }

  /**
   * Calculate CSM scorecard for a period
   */
  async calculateScorecard(csmId: string, periodStart: string, periodEnd: string) {
    const capacity = await this.calculateCapacity(csmId)

    // Tickets do agente resolvidos no período (assigned_to — coluna real)
    const { data: agentTickets } = await this.supabase
      .from('support_tickets')
      .select('id, resolved_at, created_at, first_response_at, sla_breach_resolution')
      .eq('assigned_to', csmId)
      .gte('resolved_at', periodStart)
      .lte('resolved_at', periodEnd)

    // "Escalações" como proxy: quebra de SLA de resolução
    const escalations = (agentTickets || []).filter((t: any) => t.sla_breach_resolution)
    const escalationsResolved = escalations.filter((e: any) => e.resolved_at).length

    // Tempo médio até 1ª resposta (h) — real
    const respHours = (agentTickets || [])
      .filter((t: any) => t.first_response_at && t.created_at)
      .map((t: any) => (new Date(t.first_response_at).getTime() - new Date(t.created_at).getTime()) / 3600000)
      .filter((h: number) => h >= 0)
    const avgResponseTimeHours = respHours.length > 0
      ? Math.round((respHours.reduce((s: number, h: number) => s + h, 0) / respHours.length) * 10) / 10
      : 0

    // CSAT real (csat_responses dos tickets do agente)
    const agentTicketIds = (agentTickets || []).map((t: any) => t.id)
    let avgCsat = 0, csatCount = 0
    if (agentTicketIds.length > 0) {
      const { data: csat } = await this.supabase
        .from('csat_responses').select('score').in('ticket_id', agentTicketIds)
      csatCount = (csat || []).length
      avgCsat = csatCount > 0 ? (csat || []).reduce((s: number, c: any) => s + (c.score || 0), 0) / csatCount : 0
    }

    // Get expansion deals
    const { data: expansions } = await this.supabase
      .from('contracts')
      .select('id, mrr')
      .eq('csm_owner_id', csmId)
      .eq('contract_type', 'additive')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    const expansionValue = (expansions || []).reduce((sum: number, e: any) => sum + (e.mrr || 0), 0)

    // Get renewals
    const { data: renewals } = await this.supabase
      .from('contracts')
      .select('id')
      .eq('csm_owner_id', csmId)
      .eq('contract_type', 'renewal')
      .eq('status', 'active')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    // Get churn
    const { data: accounts } = await this.supabase
      .from('accounts')
      .select('id')
      .eq('csm_owner_id', csmId)

    const { data: churned } = await this.supabase
      .from('contracts')
      .select('id')
      .eq('csm_owner_id', csmId)
      .eq('status', 'churned')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    const { data: profile } = await this.supabase
      .from('profiles')
      .select('full_name')
      .eq('id', csmId)
      .single()

    // NPS real (nps_responses não tem csm_id; junta pelas contas do CSM)
    const accountIds = (accounts || []).map((a: any) => a.id)
    let avgNps = 0, npsCount = 0
    if (accountIds.length > 0) {
      const { data: nps } = await this.supabase
        .from('nps_responses').select('score')
        .in('account_id', accountIds).not('score', 'is', null)
        .gte('responded_at', periodStart).lte('responded_at', periodEnd)
      npsCount = (nps || []).length
      avgNps = npsCount > 0 ? (nps || []).reduce((s: number, n: any) => s + (n.score || 0), 0) / npsCount : 0
    }

    // Interações por conta no período (engajamento real)
    let interactionsCount = 0
    {
      const { count } = await this.supabase
        .from('interactions').select('id', { count: 'exact', head: true })
        .eq('csm_id', csmId).gte('date', periodStart).lte('date', periodEnd)
      interactionsCount = count || 0
    }
    const interactionsPerAccount = capacity.accountsManaged > 0
      ? Math.round((interactionsCount / capacity.accountsManaged) * 10) / 10 : 0

    return {
      csmId,
      csmName: profile?.full_name || 'Unknown',
      periodStart,
      periodEnd,
      accountsManaged: capacity.accountsManaged,
      totalMrr: Math.round(capacity.totalMrr),
      healthMetrics: {
        escalationsOwned: escalations?.length || 0,
        escalationsResolved,
        escalationsResolvedPct: escalations && escalations.length > 0
          ? Math.round((escalationsResolved / escalations.length) * 100)
          : 0,
        avgHealthManagedAccounts: capacity.avgHealthScore,
      },
      customerSatisfaction: {
        avgNps: Math.round(avgNps * 10) / 10,
        npsCount,
        avgCsat: Math.round(avgCsat * 100) / 100,
        csatCount,
      },
      ticketPerformance: {
        avgResponseTimeHours,
        totalTicketsHandled: (agentTickets || []).length,
      },
      engagement: {
        interactionsPerAccount,
        expansionDeals: expansions?.length || 0,
        expansionValue: Math.round(expansionValue),
        renewalsClosed: renewals?.length || 0,
        renewalRatePct: accounts && accounts.length > 0
          ? Math.round(((renewals?.length || 0) / accounts.length) * 100)
          : 0,
        churnRatePct: accounts && accounts.length > 0
          ? Math.round(((churned?.length || 0) / accounts.length) * 100)
          : 0,
      },
      ...this.composeScorecardScore({
        avgHealth: capacity.avgHealthScore,
        avgCsat,
        csatCount,
        avgNps,
        npsCount,
        renewals: renewals?.length || 0,
        churned: churned?.length || 0,
        escalationsResolvedPct: escalations && escalations.length > 0
          ? Math.round((escalationsResolved / escalations.length) * 100) : 100,
      }),
    }
  }

  /** Score composto do scorecard (0-100) + destaques/atenção, a partir de sinais reais. */
  private composeScorecardScore(s: {
    avgHealth: number; avgCsat: number; csatCount: number; avgNps: number; npsCount: number
    renewals: number; churned: number; escalationsResolvedPct: number
  }) {
    const comps: { key: string; label: string; value: number }[] = []
    comps.push({ key: 'health', label: 'Saúde da carteira', value: s.avgHealth })
    if (s.csatCount > 0) comps.push({ key: 'csat', label: 'CSAT', value: (s.avgCsat / 5) * 100 })
    if (s.npsCount > 0) comps.push({ key: 'nps', label: 'NPS', value: (s.avgNps / 10) * 100 })
    comps.push({ key: 'escal', label: 'Resolução de escalações', value: s.escalationsResolvedPct })

    const overallScore = comps.length > 0
      ? Math.round(comps.reduce((a, c) => a + c.value, 0) / comps.length) : 0

    const sorted = [...comps].sort((a, b) => b.value - a.value)
    const topPerformance = sorted.filter(c => c.value >= 70).slice(0, 3).map(c => c.label)
    const areasForImprovement = sorted.filter(c => c.value < 60).reverse().slice(0, 3).map(c => c.label)

    return { overallScore, topPerformance, areasForImprovement }
  }

  /**
   * Calculate team velocity metrics
   */
  async calculateTeamVelocity(periodStart: string, periodEnd: string) {
    // Get onboarded accounts
    const { data: onboarded } = await this.supabase
      .from('accounts')
      .select('id, created_at')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    // Get renewals
    const { data: renewals } = await this.supabase
      .from('contracts')
      .select('id')
      .eq('contract_type', 'renewal')
      .eq('status', 'active')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    // Get churned
    const { data: churned } = await this.supabase
      .from('contracts')
      .select('id')
      .eq('status', 'churned')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    // Get expansion
    const { data: expansions } = await this.supabase
      .from('contracts')
      .select('mrr')
      .eq('contract_type', 'additive')
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    // Get CSM count
    const { data: csms } = await this.supabase
      .from('profiles')
      .select('id')
      .eq('role', 'csm')

    const expansionValue = (expansions || []).reduce((sum: number, e: any) => sum + (e.mrr || 0), 0)

    // Tickets resolvidos no período + tempo médio de resolução (real)
    const { data: resolvedTickets } = await this.supabase
      .from('support_tickets')
      .select('created_at, resolved_at')
      .not('resolved_at', 'is', null)
      .gte('resolved_at', periodStart)
      .lte('resolved_at', periodEnd)
    const resHrs = (resolvedTickets || [])
      .filter((t: any) => t.created_at && t.resolved_at)
      .map((t: any) => (new Date(t.resolved_at).getTime() - new Date(t.created_at).getTime()) / 3600000)
      .filter((h: number) => h >= 0)
    const avgResolutionTimeHours = resHrs.length > 0
      ? Math.round((resHrs.reduce((a: number, h: number) => a + h, 0) / resHrs.length) * 10) / 10 : 0

    // Tendência de saúde no período (melhorias vs regressões por conta)
    let healthImprovements = 0, healthRegressions = 0
    {
      const { data: hist } = await this.supabase
        .from('health_scores')
        .select('account_id, manual_score, shadow_score')
        .gte('evaluated_at', periodStart).lte('evaluated_at', periodEnd)
        .order('evaluated_at', { ascending: true })
      const byAcc = new Map<string, { first: number; last: number }>()
      for (const h of hist || []) {
        const score = h.manual_score ?? h.shadow_score
        if (score == null) continue
        const cur = byAcc.get(h.account_id)
        if (!cur) byAcc.set(h.account_id, { first: score, last: score })
        else cur.last = score
      }
      for (const { first, last } of byAcc.values()) {
        if (last > first) healthImprovements++
        else if (last < first) healthRegressions++
      }
    }

    // Utilização média do time + flags de sobrecarga (real)
    const caps = await Promise.all((csms || []).map((c: any) => this.calculateCapacity(c.id)))
    const utilizationPct = caps.length > 0
      ? Math.round(caps.reduce((a, c) => a + c.capacityUtilizationPct, 0) / caps.length) : 0
    const burnoutFlaggedCount = caps.filter(c => c.capacityUtilizationPct > 120).length

    return {
      periodStart,
      periodEnd,
      weekNumber: this.getWeekNumber(new Date(periodStart)),
      teamMetrics: {
        totalCsmsActive: csms?.length || 0,
        accountsOnboarded: onboarded?.length || 0,
        accountsRenewed: renewals?.length || 0,
        accountsChurned: churned?.length || 0,
        avgTtvDays: 0, // sem fonte confiável de time-to-value ainda
      },
      expansion: {
        deals: expansions?.length || 0,
        totalValue: Math.round(expansionValue),
      },
      health: {
        healthImprovements,
        healthRegressions,
      },
      support: {
        ticketsResolved: (resolvedTickets || []).length,
        avgResolutionTimeHours,
      },
      teamUtilization: {
        utilizationPct,
        burnoutFlaggedCount,
      },
      trend: 'stable',
    }
  }

  /**
   * Get ISO week number
   */
  private getWeekNumber(date: Date): number {
    const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()))
    const dayNum = d.getUTCDay() || 7
    d.setUTCDate(d.getUTCDate() + 4 - dayNum)
    const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1))
    return Math.ceil(((d.getTime() - yearStart.getTime()) / 86400000 + 1) / 7)
  }
}
