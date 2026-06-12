import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateAlertsForAccounts } from '@/lib/alerts/generate'

export const maxDuration = 300 // Allow up to 5 minutes for cron jobs on Vercel

export async function POST(request: Request) {
  // Check API Secret for internal cron auth
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any

  try {
    // Processa todas as contas. (Antes filtrava por `contract_status='active'`, coluna
    // inexistente em `accounts` — o que impedia qualquer alerta de ser gerado.)
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, health_score_v2, csm_owner_id')

    if (accountsError || !accounts) {
      return NextResponse.json({ error: accountsError?.message || 'Failed to fetch accounts' }, { status: 500 })
    }

    const { processed, created, errors } = await generateAlertsForAccounts(supabase, accounts)

    console.log(`[Proactive Alerts Cron] ${processed} contas, ${created} alertas criados`)
    if (errors.length > 0) console.error(`[Proactive Alerts Cron] ${errors.length} erros`)

    return NextResponse.json({
      success: true,
      accounts_processed: processed,
      alerts_created: created,
      total_accounts: accounts.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined,
    })
  } catch (e: any) {
    console.error('[Proactive Alerts Cron] Fatal error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
