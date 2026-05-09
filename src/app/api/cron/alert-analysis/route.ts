import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { AdvancedAlertsService } from '@/lib/alerts/advanced-alerts-service'

export const maxDuration = 300

export async function POST(request: Request) {
  // Check API Secret
  const authHeader = request.headers.get('x-api-secret')
  if (authHeader !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  let alertsCreated = 0
  let errorCount = 0
  const errors: string[] = []

  try {
    console.log('[Alert Analysis Cron] Starting alert analysis')

    const service = new AdvancedAlertsService(supabase)

    // Run all alert checks
    try {
      console.log('[Alert Analysis Cron] Checking predictive churn...')
      const churnAlerts = await service.checkPredictiveChurn()
      alertsCreated += churnAlerts.length
      console.log(`[Alert Analysis Cron] Created ${churnAlerts.length} churn alerts`)
    } catch (error: any) {
      errorCount++
      errors.push(`Churn check failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Churn check error:', error)
    }

    try {
      console.log('[Alert Analysis Cron] Detecting anomalies...')
      const anomalyAlerts = await service.detectAnomalies()
      alertsCreated += anomalyAlerts.length
      console.log(`[Alert Analysis Cron] Created ${anomalyAlerts.length} anomaly alerts`)
    } catch (error: any) {
      errorCount++
      errors.push(`Anomaly detection failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Anomaly check error:', error)
    }

    try {
      console.log('[Alert Analysis Cron] Detecting sentiment triggers...')
      const sentimentAlerts = await service.detectSentimentTriggers()
      alertsCreated += sentimentAlerts.length
      console.log(`[Alert Analysis Cron] Created ${sentimentAlerts.length} sentiment alerts`)
    } catch (error: any) {
      errorCount++
      errors.push(`Sentiment detection failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Sentiment check error:', error)
    }

    try {
      console.log('[Alert Analysis Cron] Detecting contract risks...')
      const contractAlerts = await service.detectContractRisk()
      alertsCreated += contractAlerts.length
      console.log(`[Alert Analysis Cron] Created ${contractAlerts.length} contract alerts`)
    } catch (error: any) {
      errorCount++
      errors.push(`Contract risk detection failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Contract check error:', error)
    }

    try {
      console.log('[Alert Analysis Cron] Detecting adoption cliffs...')
      const cliffAlerts = await service.detectAdoptionCliffs()
      alertsCreated += cliffAlerts.length
      console.log(`[Alert Analysis Cron] Created ${cliffAlerts.length} adoption cliff alerts`)
    } catch (error: any) {
      errorCount++
      errors.push(`Adoption cliff detection failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Cliff check error:', error)
    }

    const result = {
      success: true,
      alertsCreated,
      checksFailed: errorCount,
      errors: errors.slice(0, 5),
      message: `Created ${alertsCreated} alerts, ${errorCount} checks failed`,
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[Alert Analysis Cron] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Fatal error in alert analysis cron' },
      { status: 500 }
    )
  }
}
