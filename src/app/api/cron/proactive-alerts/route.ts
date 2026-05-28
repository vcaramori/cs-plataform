import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { AlertService } from '@/lib/alerts/alert-service'

export const maxDuration = 300 // Allow up to 5 minutes for cron jobs on Vercel

export async function POST(request: Request) {
  // Check API Secret for internal cron auth
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const supabase = getSupabaseAdminClient() as any
  let processed = 0
  let errors: string[] = []

  try {
    // Buscar accounts com contrato ativo
    const { data: accounts, error: accountsError } = await supabase
      .from('accounts')
      .select('id, health_score_v2, csm_owner_id')
      .eq('contract_status', 'active')

    if (accountsError || !accounts) {
      const errorMsg = accountsError?.message || 'Failed to fetch accounts'
      return NextResponse.json({ error: errorMsg }, { status: 500 })
    }

    console.log(`[Proactive Alerts Cron] Processing ${accounts.length} active accounts`)

    const alertService = new AlertService(supabase)
    const batchSize = 100

    // Processar em batches de 100
    for (let i = 0; i < accounts.length; i += batchSize) {
      const batch = accounts.slice(i, i + batchSize)

      const batchResults = await Promise.allSettled(
        batch.map(async (account: any) => {
          try {
            // Avaliar todos os 6 tipos
            const alerts = await alertService.evaluateAllAlerts(
              account.id,
              account.health_score_v2 || 50
            )

            // Upsert cada alerta
            for (const alert of alerts) {
              if (!alert) continue

              // Verificar se já existe alerta não resolvido do mesmo tipo neste dia
              const { data: existing } = await supabase
                .from('proactive_alerts')
                .select('id')
                .eq('account_id', account.id)
                .eq('type', alert.type)
                .is('resolved_at', null)
                .order('created_at', { ascending: false })
                .limit(1)
                .single()

              // Se já existe, skip
              if (existing) {
                continue
              }

              // Insere novo alerta
              const { data: insertedAlert, error: insertError } = await supabase
                .from('proactive_alerts')
                .insert({
                  account_id: account.id,
                  type: alert.type,
                  severity: alert.severity,
                  message: alert.message,
                  metadata: alert.metadata,
                  created_at: new Date().toISOString()
                })
                .select('id')
                .single()

              if (insertError) {
                errors.push(`[${account.id}] ${alert.type}: ${insertError.message}`)
              } else if (insertedAlert && account.csm_owner_id) {
                // Cria tarefa sugerida vinculada ao alerta para o CSM da conta
                const recommendation = alert.metadata?.recommendation as string | undefined
                await supabase.from('csm_tasks').insert({
                  csm_id: account.csm_owner_id,
                  account_id: account.id,
                  title: recommendation || alert.message.slice(0, 120),
                  description: alert.message,
                  status: 'todo',
                  priority: alert.severity === 'critical' ? 'high' : 'medium',
                  alert_id: insertedAlert.id,
                  source_label: 'alert',
                })
              }
            }

            processed++
          } catch (e: any) {
            errors.push(`Account ${account.id}: ${e.message}`)
          }
        })
      )

      // Log batch results
      batchResults.forEach((result, idx) => {
        if (result.status === 'rejected') {
          errors.push(`Batch error at ${i + idx}: ${result.reason}`)
        }
      })
    }

    console.log(
      `[Proactive Alerts Cron] Completed: ${processed}/${accounts.length} accounts processed`
    )
    if (errors.length > 0) {
      console.error(`[Proactive Alerts Cron] Errors: ${errors.length}`)
    }

    return NextResponse.json({
      success: true,
      accounts_processed: processed,
      total_accounts: accounts.length,
      errors: errors.length > 0 ? errors.slice(0, 20) : undefined
    })
  } catch (e: any) {
    console.error('[Proactive Alerts Cron] Fatal error:', e.message)
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
