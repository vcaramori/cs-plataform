import { subDays } from 'date-fns'

/**
 * Catálogo consolidado (Wave 8): tipos que antes só existiam no feed efêmero do
 * sininho (`/api/notifications`) agora são persistidos como `proactive_alerts`,
 * ganhando ciclo de vida, leitura por usuário e vínculo com a entidade tratada.
 *
 * Mantidos no nível da CONTA (1 ativo por (account_id, type)) para respeitar o
 * índice único `proactive_alerts_daily_uniq`. Tipos por ticket agregam a contagem
 * em `metadata` e apontam `linked_entity` para o ticket mais relevante.
 *
 * `mention` e `follow_up_alert` ficam de fora do catálogo persistido: são pessoais
 * (por e-mail) / efêmeros (janela de 30 min) e seguem como overlay em tempo real.
 */
export type DerivedAlertType = 'discrepancy' | 'stale_score' | 'sla_breach' | 'new_ticket'

export interface DerivedAlert {
  type: DerivedAlertType
  severity: 'critical' | 'warning' | 'info'
  message: string
  metadata: Record<string, any>
  linked_entity_type: string | null
  linked_entity_id: string | null
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function evaluateDerivedCatalog(supabase: any, accountId: string): Promise<DerivedAlert[]> {
  const out: DerivedAlert[] = []
  const thirtyDaysAgo = subDays(new Date(), 30).toISOString()

  // DISCREPÂNCIA: shadow score diverge do manual (flag na conta)
  const { data: acc } = await supabase
    .from('accounts')
    .select('discrepancy_alert')
    .eq('id', accountId)
    .single()
  if (acc?.discrepancy_alert) {
    out.push({
      type: 'discrepancy',
      severity: 'critical',
      message: 'Shadow Score diverge significativamente do health manual.',
      metadata: { recommendation: 'Revisar e reconciliar o health score manual.' },
      linked_entity_type: null,
      linked_entity_id: null,
    })
  }

  // SCORE DESATUALIZADO: última avaliação manual há mais de 30 dias
  const { data: lastManual } = await supabase
    .from('health_scores')
    .select('evaluated_at')
    .eq('account_id', accountId)
    .not('manual_score', 'is', null)
    .order('evaluated_at', { ascending: false })
    .limit(1)
    .maybeSingle()
  if (lastManual && new Date(lastManual.evaluated_at) < new Date(thirtyDaysAgo)) {
    out.push({
      type: 'stale_score',
      severity: 'warning',
      message: 'Health Score manual desatualizado há mais de 30 dias.',
      metadata: { last_evaluated: lastManual.evaluated_at, recommendation: 'Atualizar a avaliação manual de saúde.' },
      linked_entity_type: null,
      linked_entity_id: null,
    })
  }

  // SLA EM RISCO: tickets com SLA vencido/em atenção
  const { data: slaTickets } = await supabase
    .from('support_tickets')
    .select('id, sla_status_first_response, sla_status_resolution')
    .eq('account_id', accountId)
    .or('sla_status_first_response.eq.vencido,sla_status_first_response.eq.atencao,sla_status_resolution.eq.vencido,sla_status_resolution.eq.atencao')
  if (slaTickets && slaTickets.length > 0) {
    const breached = slaTickets.some((t: any) => t.sla_status_first_response === 'vencido' || t.sla_status_resolution === 'vencido')
    out.push({
      type: 'sla_breach',
      severity: breached ? 'critical' : 'warning',
      message: `${slaTickets.length} ticket(s) com SLA ${breached ? 'vencido' : 'em atenção'}.`,
      metadata: { count: slaTickets.length, recommendation: 'Priorizar o atendimento dos tickets em risco de SLA.' },
      linked_entity_type: 'support_ticket',
      linked_entity_id: slaTickets[0].id,
    })
  }

  // NOVOS CHAMADOS: abertos, sem atribuição e sem primeira resposta
  const { data: newTickets } = await supabase
    .from('support_tickets')
    .select('id')
    .eq('account_id', accountId)
    .eq('status', 'open')
    .is('assigned_to', null)
    .is('first_response_at', null)
  if (newTickets && newTickets.length > 0) {
    out.push({
      type: 'new_ticket',
      severity: 'info',
      message: `${newTickets.length} novo(s) chamado(s) aguardando triagem.`,
      metadata: { count: newTickets.length, recommendation: 'Fazer triagem e atribuição dos novos chamados.' },
      linked_entity_type: 'support_ticket',
      linked_entity_id: newTickets[0].id,
    })
  }

  return out
}
