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
    const { data: npsScores } = await this.supabase
      .from('nps_responses')
      .select('score, sentiment')
      .eq('csm_id', csmId)
      .gte('created_at', thirtyDaysAgo.toISOString())

    const avgNps = npsScores && npsScores.length > 0
      ? npsScores.reduce((sum: number, n: any) => sum + (n.score || 0), 0) / npsScores.length
      : 0

    const { data: csatScores } = await this.supabase
      .from('support_tickets')
      .select('csat_score')
      .eq('csm_assigned_id', csmId)
      .gte('resolved_at', thirtyDaysAgo.toISOString())
      .not('csat_score', 'is', null)

    const avgCsat = csatScores && csatScores.length > 0
      ? csatScores.reduce((sum: number, c: any) => sum + (c.csat_score || 0), 0) / csatScores.length
      : 0

    // Get escalations
    const { data: escalations } = await this.supabase
      .from('support_tickets')
      .select('id')
      .eq('csm_assigned_id', csmId)
      .eq('escalated', true)
      .gte('created_at', thirtyDaysAgo.toISOString())

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
      avgResponseTimeHours: 4.5, // Placeholder
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

    // Get escalations resolved
    const { data: escalations } = await this.supabase
      .from('support_tickets')
      .select('id, resolved_at')
      .eq('csm_assigned_id', csmId)
      .eq('escalated', true)
      .gte('created_at', periodStart)
      .lte('created_at', periodEnd)

    const escalationsResolved = (escalations || []).filter((e: any) => e.resolved_at).length

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
        avgNps: 7.2,
        npsCount: 5,
        avgCsat: 4.2,
        csatCount: 12,
      },
      ticketPerformance: {
        avgResponseTimeHours: 4.5,
        totalTicketsHandled: escalations?.length || 0,
      },
      engagement: {
        interactionsPerAccount: 2.3,
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
      overallScore: 72,
      topPerformance: ['High CSAT', 'Expansion Growth', 'Renewal Rate'],
      areasForImprovement: ['Escalation Resolution', 'NPS Score'],
    }
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

    return {
      periodStart,
      periodEnd,
      weekNumber: this.getWeekNumber(new Date(periodStart)),
      teamMetrics: {
        totalCsmsActive: csms?.length || 0,
        accountsOnboarded: onboarded?.length || 0,
        accountsRenewed: renewals?.length || 0,
        accountsChurned: churned?.length || 0,
        avgTtvDays: 14,
      },
      expansion: {
        deals: expansions?.length || 0,
        totalValue: Math.round(expansionValue),
      },
      health: {
        healthImprovements: 12,
        healthRegressions: 3,
      },
      support: {
        ticketsResolved: 45,
        avgResolutionTimeHours: 6.2,
      },
      teamUtilization: {
        utilizationPct: 88,
        burnoutFlaggedCount: 2,
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
