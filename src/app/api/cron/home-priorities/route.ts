import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export const maxDuration = 300

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  if (authHeader !== `Bearer ${process.env.API_SECRET}`) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const now = new Date()
  const accounts_processed: any[] = []
  const errors: any[] = []

  try {
    // Get all active CSMs and accounts
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, name, csm_owner_id, health_score_v2, health_status')
      .eq('contract_status', 'active')

    if (accountsError) throw accountsError

    // Clear previous day's priorities
    await supabase
      .from('daily_home_priorities')
      .delete()
      .lt('created_at', new Date(now.getTime() - 24 * 60 * 60 * 1000).toISOString())

    // Process in batches
    const batch_size = 50
    for (let i = 0; i < (accounts || []).length; i += batch_size) {
      const batch = (accounts || []).slice(i, i + batch_size)

      await Promise.allSettled(
        batch.map(async (account: any) => {
          const priorities: any[] = []

          // 1. "Focar Agora" — Health crítico + alertas ativos
          if (account.health_status === 'critical') {
            const { data: unresolved_alerts } = await supabase
              .from('proactive_alerts')
              .select('id')
              .eq('account_id', account.id)
              .is('resolved_at', null)
              .limit(1)

            if ((unresolved_alerts || []).length > 0) {
              priorities.push({
                category: 'focar_agora',
                reason: `Health crítico (${account.health_score_v2?.toFixed(0) || 0}/100) + alertas ativos`,
                score: 10,
                action_type: 'review_health'
              })
            }
          }

          // 2. "Manter Momentum" — Saudável mas sem interação > 7 dias
          if (account.health_status === 'healthy') {
            const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000).toISOString()
            const { data: recent_interactions } = await supabase
              .from('interactions')
              .select('id')
              .eq('account_id', account.id)
              .gte('interaction_date', sevenDaysAgo)
              .limit(1)

            if ((recent_interactions || []).length === 0) {
              priorities.push({
                category: 'manter_momentum',
                reason: `Conta saudável sem interação nos últimos 7 dias`,
                score: 5,
                action_type: 'schedule_interaction'
              })
            }
          }

          // 3. "Oportunidade" — Expansion signal alert ativo
          const { data: expansion_alerts } = await supabase
            .from('proactive_alerts')
            .select('id')
            .eq('account_id', account.id)
            .eq('type', 'expansion_signal')
            .is('resolved_at', null)
            .limit(1)

          if ((expansion_alerts || []).length > 0) {
            priorities.push({
              category: 'oportunidade',
              reason: `Sinal de expansão detectado`,
              score: 7,
              action_type: 'explore_expansion'
            })
          }

          // Insert priorities
          if (priorities.length > 0) {
            const inserts = priorities.map(p => ({
              csm_id: account.csm_owner_id,
              account_id: account.id,
              ...p
            }))

            await supabase
              .from('daily_home_priorities')
              .insert(inserts)
          }

          accounts_processed.push(account.id)
        })
      )
    }

    return NextResponse.json({
      success: true,
      ran_at: now.toISOString(),
      accounts_processed: accounts_processed.length,
      total_accounts: (accounts || []).length,
      errors_count: errors.length
    })
  } catch (err: any) {
    console.error('Home priorities cron error:', err)
    return NextResponse.json(
      {
        success: false,
        error: err.message,
        accounts_processed: accounts_processed.length
      },
      { status: 500 }
    )
  }
}
