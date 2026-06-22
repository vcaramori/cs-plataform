import { AlertService } from './alert-service'
import { evaluateDerivedCatalog } from './catalog-alerts'

export interface GenerateResult {
  processed: number
  created: number
  errors: string[]
}

export interface AccountForAlerts {
  id: string
  health_score_v2?: number | null
  csm_owner_id?: string | null
}

/**
 * Geração consolidada de alertas (Wave 8), compartilhada entre a cron e o endpoint
 * "Avaliar agora". Para cada conta avalia os 7 tipos nativos (AlertService) + o
 * catálogo derivado (SLA, novos tickets, discrepância, score desatualizado),
 * persistindo em `proactive_alerts` de forma idempotente (1 ativo por tipo/entidade).
 *
 * Alertas nativos sem entidade ganham uma `csm_task` sugerida (com `alert_id`), e o
 * alerta passa a apontar `linked_entity_type='csm_task'` — assim o "tratado ou não"
 * é derivado do estado da tarefa.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function generateAlertsForAccounts(supabase: any, accounts: AccountForAlerts[]): Promise<GenerateResult> {
  const service = new AlertService(supabase)
  let created = 0
  const errors: string[] = []

  for (const account of accounts) {
    try {
      const native = await service.evaluateAllAlerts(account.id, account.health_score_v2 || 50)
      const derived = await evaluateDerivedCatalog(supabase, account.id)

      const all = [
        ...native.map((a: any) => ({ ...a, linked_entity_type: null, linked_entity_id: null })),
        ...derived,
      ]

      for (const alert of all) {
        if (!alert) continue

        // Idempotência: pula se já existe alerta ATIVO do mesmo tipo (+entidade quando houver)
        let existingQ = supabase
          .from('proactive_alerts')
          .select('id')
          .eq('account_id', account.id)
          .eq('type', alert.type)
          .is('resolved_at', null)
        existingQ = alert.linked_entity_id
          ? existingQ.eq('linked_entity_id', alert.linked_entity_id)
          : existingQ.is('linked_entity_id', null)
        const { data: existing } = await existingQ.limit(1).maybeSingle()
        if (existing) continue

        const { data: inserted, error: insErr } = await supabase
          .from('proactive_alerts')
          .insert({
            account_id: account.id,
            type: alert.type,
            severity: alert.severity,
            message: alert.message,
            metadata: alert.metadata,
            linked_entity_type: alert.linked_entity_type ?? null,
            linked_entity_id: alert.linked_entity_id ?? null,
            created_at: new Date().toISOString(),
          })
          .select('id')
          .single()

        if (insErr) {
          // Violação da unicidade diária (alerta do tipo já criado hoje) = idempotência,
          // não erro: pula em silêncio (ex.: cron reexecutado no mesmo dia).
          const dup = insErr.code === '23505' || /duplicate key|proactive_alerts_daily_uniq/i.test(insErr.message ?? '')
          if (!dup) errors.push(`[${account.id}] ${alert.type}: ${insErr.message}`)
          continue
        }
        created++

        // Alerta nativo (sem entidade): cria tarefa sugerida e vincula como entidade tratada
        if (!alert.linked_entity_id && account.csm_owner_id) {
          const recommendation = alert.metadata?.recommendation as string | undefined
          const { data: task } = await supabase
            .from('csm_tasks')
            .insert({
              csm_id: account.csm_owner_id,
              account_id: account.id,
              title: recommendation || String(alert.message).slice(0, 120),
              description: alert.message,
              status: 'todo',
              priority: alert.severity === 'critical' ? 'high' : 'medium',
              alert_id: inserted.id,
              source_label: 'alert',
            })
            .select('id')
            .single()
          if (task?.id) {
            await supabase
              .from('proactive_alerts')
              .update({ linked_entity_type: 'csm_task', linked_entity_id: task.id })
              .eq('id', inserted.id)
          }
        }
      }
    } catch (e: any) {
      errors.push(`Account ${account.id}: ${e?.message ?? 'erro'}`)
    }
  }

  return { processed: accounts.length, created, errors }
}
