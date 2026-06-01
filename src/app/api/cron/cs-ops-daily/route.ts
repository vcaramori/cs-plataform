import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { CSOperationsService } from '@/lib/cs-ops/cs-ops-service'

export const maxDuration = 300

export async function POST(request: Request) {
  // Check API Secret
  const authHeader = request.headers.get('x-api-secret')
  if (authHeader !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  let processedCount = 0
  let errorCount = 0
  const errors: string[] = []

  try {
    // Get all CSMs
    const { data: csms, error: csmsError } = await (supabase as any)
      .from('profiles')
      .select('id, full_name')
      .eq('role', 'csm')

    if (csmsError || !csms) {
      const msg = csmsError?.message || 'Failed to fetch CSMs'
      console.error('[CS Ops Daily Cron] Error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }


    const service = new CSOperationsService(supabase)
    const today = new Date().toISOString().split('T')[0]

    // Process CSMs
    for (const csm of csms) {
      try {
        // Calculate capacity
        const capacity = await service.calculateCapacity(csm.id)

        // Store capacity snapshot
        await (supabase as any)
          .from('csm_capacity')
          .insert([
            {
              csm_id: csm.id,
              snapshot_date: today,
              accounts_managed: capacity.accountsManaged,
              total_mrr: capacity.totalMrr,
              total_arr: capacity.totalArr,
              avg_health_score: capacity.avgHealthScore,
              capacity_utilization_pct: capacity.capacityUtilizationPct,
              workload_status: capacity.workloadStatus,
              hours_allocated_weekly: capacity.hoursAllocatedWeekly,
              hours_billable_weekly: capacity.hoursBillableWeekly,
              hours_internal_weekly: capacity.hoursInternalWeekly,
              billable_utilization_pct: capacity.billableUtilizationPct,
            },
          ])

        // Calculate health
        const health = await service.calculateHealth(csm.id)

        // Store health snapshot
        await (supabase as any)
          .from('csm_health')
          .insert([
            {
              csm_id: csm.id,
              snapshot_date: today,
              utilization_pct: health.utilizationPct,
              avg_response_time_hrs: health.avgResponseTimeHours,
              escalations_owned: health.escalationsOwned,
              avg_csat_score: health.avgCsatScore,
              avg_nps_team: health.avgNpsTeam,
              burnout_risk_score: health.burnoutRiskScore,
              burnout_indicators: health.burnoutIndicators,
              flagged_as_high_risk: health.flaggedAsHighRisk,
            },
          ])

        // Calculate velocity for the week
        const weekStart = new Date()
        weekStart.setDate(weekStart.getDate() - weekStart.getDay())
        const weekEnd = new Date(weekStart)
        weekEnd.setDate(weekEnd.getDate() + 6)

        const velocity = await service.calculateTeamVelocity(
          weekStart.toISOString().split('T')[0],
          weekEnd.toISOString().split('T')[0]
        )

        // Store velocity metrics
        await (supabase as any)
          .from('team_velocity')
          .insert([
            {
              period_start: velocity.periodStart,
              period_end: velocity.periodEnd,
              week_number: velocity.weekNumber,
              total_csms_active: csms.length,
              accounts_onboarded: velocity.teamMetrics.accountsOnboarded,
              accounts_renewed: velocity.teamMetrics.accountsRenewed,
              accounts_churned: velocity.teamMetrics.accountsChurned,
              expansion_deals: velocity.expansion.deals,
              expansion_total_value: velocity.expansion.totalValue,
              avg_ttv_days: velocity.teamMetrics.avgTtvDays,
              health_improvements: velocity.health.healthImprovements,
              health_regressions: velocity.health.healthRegressions,
              ticket_volume_resolved: velocity.support.ticketsResolved,
              avg_resolution_time_hrs: velocity.support.avgResolutionTimeHours,
              team_utilization_pct: velocity.teamUtilization.utilizationPct,
              team_burnout_count: velocity.teamUtilization.burnoutFlaggedCount,
            },
          ])

        processedCount++
      } catch (error: any) {
        errorCount++
        const errorMsg = `CSM ${csm.id}: ${error.message}`
        errors.push(errorMsg)
        console.error('[CS Ops Daily Cron]', errorMsg)
      }
    }

    const result = {
      success: true,
      processedCount,
      errorCount,
      errors: errors.slice(0, 10),
      message: `Processed ${processedCount} CSMs, ${errorCount} errors`,
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[CS Ops Daily Cron] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Fatal error in CS Ops daily cron' },
      { status: 500 }
    )
  }
}
