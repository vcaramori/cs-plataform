import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { runAutomatedAccountAnalysis } from '@/lib/ai/automated-account-analysis'

export const maxDuration = 300 // 5 minutes max on Vercel Pro

/**
 * POST /api/cron/shadow-score-weekly
 * 
 * Generates Shadow Score (AI health) for ALL active accounts.
 * Called weekly by the Supabase Edge Function `cron-shadow-score-weekly`
 * via pg_cron schedule: 0 8 * * 1 (Mondays at 8am UTC)
 * 
 * Auth: x-api-secret header (server-to-server)
 */
export async function POST(request: Request) {
  const authHeader = request.headers.get('x-api-secret')
  if (authHeader !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const startedAt = new Date().toISOString()

  const { data: accounts, error: accountsError } = await supabase
    .from('accounts')
    .select('id, name')

  if (accountsError || !accounts) {
    return NextResponse.json(
      { error: accountsError?.message || 'Failed to fetch accounts' },
      { status: 500 }
    )
  }


  let processed = 0
  let errors = 0
  const errorDetails: string[] = []

  // Process in batches of 5 to avoid overwhelming the AI provider
  const BATCH_SIZE = 5
  for (let i = 0; i < accounts.length; i += BATCH_SIZE) {
    const batch = accounts.slice(i, i + BATCH_SIZE)

    const results = await Promise.allSettled(
      batch.map(async (account) => {
        const result = await runAutomatedAccountAnalysis(account.id)
        if (!result) throw new Error(`Analysis returned null for ${account.name}`)
        return result
      })
    )

    results.forEach((result, idx) => {
      if (result.status === 'fulfilled') {
        processed++
      } else {
        errors++
        const msg = `${batch[idx].name}: ${result.reason?.message ?? 'Unknown error'}`
        errorDetails.push(msg)
        console.error('[Shadow Score Weekly]', msg)
      }
    })

  }

  return NextResponse.json({
    success: true,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    total: accounts.length,
    processed,
    errors,
    error_details: errorDetails.length > 0 ? errorDetails.slice(0, 10) : undefined,
  })
}
