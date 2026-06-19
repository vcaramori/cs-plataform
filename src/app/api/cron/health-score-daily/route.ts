import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from "@/lib/integrations/helpdesk/auth"
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { calculateCompleteHealthScore } from '@/lib/health/weighted-score'

export const maxDuration = 300 // Allow up to 5 minutes for cron jobs on Vercel

export async function POST(request: Request) {
  // Check API Secret for internal cron auth
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any // TECH_DEBT #8: schema/tipos ainda divergem neste arquivo

  let processedCount = 0
  let errorCount = 0
  const errors: string[] = []

  try {
    // Busca todas as contas. (Antes filtrava por accounts.contract_status='active',
    // coluna inexistente — o Postgres rejeitava a query e o cron falhava. O conceito
    // de "ativo" mora em contracts.status; processar todas as contas é seguro aqui.)
    const { data: accounts, error: accountsError } = await db
      .from('accounts')
      .select('id, name, health_score')

    if (accountsError || !accounts) {
      const errorMsg = accountsError?.message || 'Failed to fetch accounts'
      console.error('[Health Score Cron] Error fetching accounts:', errorMsg)
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }


    // Process accounts in batches of 100
    const batchSize = 100
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize)

      const batchResults = await Promise.allSettled(
        batch.map(async (account: any) => {
          try {
            // Calculate complete weighted health score
            const result = await calculateCompleteHealthScore(account.id)

            // Upsert health score v2 into accounts table
            const { error: updateError } = await db
              .from('accounts')
              .update({
                health_score_v2: result.score,
                health_breakdown: result.breakdown,
                health_status: result.status,
                health_classified_at: new Date().toISOString()
              })
              .eq('id', account.id)

            if (updateError) {
              throw new Error(updateError.message)
            }

            processedCount++
            return {
              accountId: account.id,
              accountName: account.name,
              score: result.score,
              status: result.status
            }
          } catch (error: any) {
            errorCount++
            const errorMsg = `Account ${account.id}: ${error.message}`
            errors.push(errorMsg)
            console.error('[Health Score Cron]', errorMsg)
            throw error
          }
        })
      )

      // Log batch results
      console.log(
        `[Health Score Cron] Batch ${Math.floor(i / batchSize) + 1}: ${processedCount} processed, ${errorCount} errors`
      )
    }

    return NextResponse.json({
      success: true,
      ran_at: new Date().toISOString(),
      accounts_processed: processedCount,
      total_accounts: accounts.length,
      errors_count: errorCount,
      errors: errors.length > 0 ? errors.slice(0, 10) : undefined // Limit error array to first 10
    })
  } catch (error: any) {
    console.error('[Health Score Cron] Fatal Error:', error)
    return NextResponse.json(
      { error: error.message || 'Internal Server Error' },
      { status: 500 }
    )
  }
}
