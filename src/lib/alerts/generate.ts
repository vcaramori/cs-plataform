import { AlertService } from './alert-service'
import { evaluateDerivedCatalog } from './catalog-alerts'
import { notifyTeamsWebhook, TeamsAlertPayload } from './teams-notifier'

export interface GenerateResult {
  processed: number
  created: number
  errors: string[]
}

export interface AccountForAlerts {
  id: string
  name: string
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
  const newAlertsForTeams: TeamsAlertPayload[] = []

  const ALERT_TYPE_NAMES: Record<string, string> = {
    churn_risk: 'Risco de Churn',
    silent_customer: 'Cliente Silencioso',
    renewal_upcoming: 'Renovação Próxima',
    adoption_anomaly: 'Anomalia de Adoção',
    expansion_signal: 'Sinal de Expansão',
    nps_detractor_unactioned: 'Detrator NPS Sem Ação',
    sla_breach: 'SLA Rompido',
    stale_health_score: 'Health Score Desatualizado',
    new_ticket: 'Novo Chamado',
    health_score_discrepancy: 'Discrepância no Health Score'
  }

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

        if (account.csm_owner_id) {
          let detailedMessage = `[${account.name}] ${alert.message}`
          
          if (alert.type === 'expansion_signal' && alert.metadata?.snippet) {
            detailedMessage += `\nTrecho identificado: "${alert.metadata.snippet}"`
          } else if (alert.metadata?.snippet) {
            detailedMessage += `\nDetalhes adicionais: "${alert.metadata.snippet}"`
          }

          newAlertsForTeams.push({
            alert_id: inserted.id,
            alert_type: ALERT_TYPE_NAMES[alert.type] || alert.type,
            severity: alert.severity,
            message: detailedMessage,
            csm_email: account.csm_owner_id, // temporarily hold ID, map to email later
            account_id: account.id,
          })
        }

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

  // Notificar Teams via Power Automate (Webhook global)
  if (newAlertsForTeams.length > 0) {
    try {
      const uniqueCsmIds = [...new Set(newAlertsForTeams.map(a => a.csm_email))]
      const emailMap = new Map<string, string>()
      
      for (const id of uniqueCsmIds) {
        const { data: { user } } = await supabase.auth.admin.getUserById(id)
        if (user?.email) emailMap.set(id, user.email)
      }

      const payload = newAlertsForTeams.map(a => ({
        ...a,
        csm_email: emailMap.get(a.csm_email) || '',
      })).filter(a => !!a.csm_email)

      if (payload.length > 0) {
        await notifyTeamsWebhook(supabase, payload)
      }
    } catch (err: any) {
      console.error('[Generate Alerts] Erro ao preparar notificação do Teams:', err?.message)
    }
  }

  return { processed: accounts.length, created, errors }
}
