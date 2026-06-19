import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from "@/lib/integrations/helpdesk/auth"
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { AdoptionService } from '@/lib/adoption/adoption-service'

export const maxDuration = 300

export async function POST(request: Request) {
  // Check API Secret
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  let processedCount = 0
  let errorCount = 0
  const errors: string[] = []

  try {
    // Processa todas as contas (accounts.contract_status NÃO existe — o conceito de
    // "ativo" mora em contracts.status; filtrar pela coluna inexistente quebrava o cron com 500).
    const { data: accounts, error: accountsError } = await (supabase as any)
      .from('accounts')
      .select('id, name')

    if (accountsError || !accounts) {
      const msg = accountsError?.message || 'Failed to fetch accounts'
      console.error('[Adoption Analysis Cron] Error:', msg)
      return NextResponse.json({ error: msg }, { status: 500 })
    }


    const service = new AdoptionService(supabase)

    // Process accounts in batches
    const batchSize = 10
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize)

      const batchResults = await Promise.allSettled(
        batch.map(async (account: any) => {
          try {
            // Get adoption heatmap
            const heatmap = await service.getAdoptionHeatmap(account.id, 90)

            // Store adoption analysis
            await (supabase as any)
              .from('adoption_analysis')
              .insert([
                {
                  account_id: account.id,
                  analysis_date: new Date().toISOString().split('T')[0],
                  feature_count_total: heatmap.summary.featuresTotal,
                  feature_count_adopted: heatmap.summary.featuresAdopted,
                  overall_adoption_pct: heatmap.summary.overallAdoptionPct,
                  adoption_trend: heatmap.summary.adoptionTrend,
                  flagged_blockers: heatmap.data.slice(0, 3).map((f: any) => f.featureName),
                },
              ])

            // Detect blockers
            const blockers = await service.detectBlockersAI(account.id)

            // Store blockers
            for (const blocker of blockers) {
              await (supabase as any)
                .from('feature_blockers')
                .upsert(
                  [
                    {
                      account_id: account.id,
                      feature_id: blocker.featureId,
                      blocker_type: blocker.blockerType,
                      severity: blocker.severity,
                      description: blocker.description,
                      root_cause_analysis: blocker.rootCauseAnalysis,
                      detection_source: 'system_inference',
                    },
                  ],
                  {
                    onConflict: 'account_id,feature_id,detection_source',
                  }
                )
            }

            processedCount++
            return { accountId: account.id, success: true }
          } catch (error: any) {
            errorCount++
            const errorMsg = `Account ${account.id}: ${error.message}`
            errors.push(errorMsg)
            console.error('[Adoption Analysis Cron]', errorMsg)
            throw error
          }
        })
      )

      // Log batch results
      const batchSuccessCount = batchResults.filter((r) => r.status === 'fulfilled').length
      console.log(
        `[Adoption Analysis Cron] Batch ${Math.floor(i / batchSize) + 1}: ${batchSuccessCount}/${batch.length} successful`
      )
    }

    const result = {
      success: true,
      processedCount,
      errorCount,
      errors: errors.slice(0, 10), // Return first 10 errors
      message: `Processed ${processedCount} accounts, ${errorCount} errors`,
    }

    return NextResponse.json(result, { status: 200 })
  } catch (error: any) {
    console.error('[Adoption Analysis Cron] Fatal error:', error)
    return NextResponse.json(
      { error: error.message || 'Fatal error in adoption analysis cron' },
      { status: 500 }
    )
  }
}
