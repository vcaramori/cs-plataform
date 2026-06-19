import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from "@/lib/integrations/helpdesk/auth"
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { AdvancedAlertsService } from '@/lib/alerts/advanced-alerts-service'

export const maxDuration = 300

export async function POST(request: Request) {
  // Check API Secret
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  let alertsCreated = 0
  let errorCount = 0
  const errors: string[] = []

  try {

    const service = new AdvancedAlertsService(supabase)

    // Run all alert checks
    try {
      const churnAlerts = await service.checkPredictiveChurn()
      alertsCreated += churnAlerts.length
    } catch (error: any) {
      errorCount++
      errors.push(`Churn check failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Churn check error:', error)
    }

    try {
      const anomalyAlerts = await service.detectAnomalies()
      alertsCreated += anomalyAlerts.length
    } catch (error: any) {
      errorCount++
      errors.push(`Anomaly detection failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Anomaly check error:', error)
    }

    try {
      const sentimentAlerts = await service.detectSentimentTriggers()
      alertsCreated += sentimentAlerts.length
    } catch (error: any) {
      errorCount++
      errors.push(`Sentiment detection failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Sentiment check error:', error)
    }

    try {
      const contractAlerts = await service.detectContractRisk()
      alertsCreated += contractAlerts.length
    } catch (error: any) {
      errorCount++
      errors.push(`Contract risk detection failed: ${error.message}`)
      console.error('[Alert Analysis Cron] Contract check error:', error)
    }

    try {
      const cliffAlerts = await service.detectAdoptionCliffs()
      alertsCreated += cliffAlerts.length
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
