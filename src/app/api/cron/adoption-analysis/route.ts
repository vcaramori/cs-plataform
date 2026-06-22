import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { computeAccountAdoption } from '@/lib/adoption/account-adoption'

export const maxDuration = 300

/**
 * Snapshot diário de adoção por conta (modelo real: feature_adoption).
 * Grava em adoption_analysis (upsert idempotente por conta+dia), com a tendência
 * comparada ao último snapshot anterior. Pula contas sem dados de adoção.
 */
export async function POST(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient() as any
  const analysisDate = new Date().toISOString().split('T')[0]
  let processed = 0
  let skipped = 0
  const errors: string[] = []

  try {
    const { data: accounts, error: accountsError } = await supabase.from('accounts').select('id, name')
    if (accountsError || !accounts) {
      return NextResponse.json({ error: accountsError?.message || 'Failed to fetch accounts' }, { status: 500 })
    }

    const batchSize = 20
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize)
      await Promise.all(
        batch.map(async (account: any) => {
          try {
            const adoption = await computeAccountAdoption(account.id, supabase)
            if (!adoption.hasData) { skipped++; return }

            // Tendência vs. último snapshot ANTERIOR (antes de hoje).
            const { data: prev } = await supabase
              .from('adoption_analysis')
              .select('overall_adoption_pct')
              .eq('account_id', account.id)
              .lt('analysis_date', analysisDate)
              .order('analysis_date', { ascending: false })
              .limit(1)
              .maybeSingle()
            let trend: string | null = null
            if (prev) {
              const delta = adoption.overallAdoptionPct - prev.overall_adoption_pct
              trend = delta > 5 ? 'accelerating' : delta < -5 ? 'declining' : 'stable'
            }

            const { error: upErr } = await supabase.from('adoption_analysis').upsert(
              {
                account_id: account.id,
                analysis_date: analysisDate,
                feature_count_total: adoption.featuresTotal,
                feature_count_adopted: adoption.featuresAdopted,
                overall_adoption_pct: adoption.overallAdoptionPct,
                adoption_trend: trend,
              },
              { onConflict: 'account_id,analysis_date' }
            )
            if (upErr) { errors.push(`Account ${account.id}: ${upErr.message}`); return }
            processed++
          } catch (e: any) {
            errors.push(`Account ${account.id}: ${e?.message ?? 'erro'}`)
          }
        })
      )
    }

    return NextResponse.json({
      success: true,
      analysis_date: analysisDate,
      processed,
      skipped,
      total_accounts: accounts.length,
      errors: errors.slice(0, 10),
      message: `Snapshot de adoção: ${processed} contas com dados, ${skipped} sem dados${errors.length ? `, ${errors.length} erros` : ''}`,
    })
  } catch (error: any) {
    console.error('[Adoption Analysis Cron] Fatal:', error)
    return NextResponse.json({ error: error.message || 'Fatal error' }, { status: 500 })
  }
}
