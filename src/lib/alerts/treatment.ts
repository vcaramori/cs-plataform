/**
 * Tratamento DERIVADO do estado da entidade vinculada (Wave 8).
 * "Tratado ou não" não é um workflow manual: lê-se o estado da coisa dentro da
 * ferramenta que o alerta gerou/aponta (tarefa concluída? ticket resolvido?
 * negociação fechada?). Alertas sem entidade caem no resolve manual (`resolved_at`).
 */

export type Treatment = 'pendente' | 'tratado'

export interface AlertTreatment {
  treatment: Treatment
  entity: {
    type: string | null
    label: string
    status: string | null
    href: string | null
  } | null
}

const TICKET_DONE = new Set(['resolved', 'closed', 'resolvido', 'fechado', 'cancelled', 'cancelado'])

interface AlertLike {
  id: string
  resolved_at: string | null
  linked_entity_type: string | null
  linked_entity_id: string | null
}

/**
 * Resolve o tratamento de uma lista de alertas em lote (poucas queries),
 * lendo o estado atual das entidades vinculadas.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export async function deriveTreatments(supabase: any, alerts: AlertLike[]): Promise<Map<string, AlertTreatment>> {
  const result = new Map<string, AlertTreatment>()

  const taskIds = alerts.filter(a => a.linked_entity_type === 'csm_task' && a.linked_entity_id).map(a => a.linked_entity_id!) as string[]
  const ticketIds = alerts.filter(a => a.linked_entity_type === 'support_ticket' && a.linked_entity_id).map(a => a.linked_entity_id!) as string[]
  const negIds = alerts.filter(a => a.linked_entity_type === 'negotiation' && a.linked_entity_id).map(a => a.linked_entity_id!) as string[]

  const taskMap = new Map<string, any>()
  if (taskIds.length > 0) {
    const { data } = await supabase.from('csm_tasks').select('id, status, completed_at, deleted_at').in('id', taskIds)
    for (const t of data ?? []) taskMap.set(t.id, t)
  }
  const ticketMap = new Map<string, any>()
  if (ticketIds.length > 0) {
    const { data } = await supabase.from('support_tickets').select('id, status').in('id', ticketIds)
    for (const t of data ?? []) ticketMap.set(t.id, t)
  }
  const negMap = new Map<string, any>()
  if (negIds.length > 0) {
    const { data } = await supabase.from('negotiations').select('id, status').in('id', negIds)
    for (const n of data ?? []) negMap.set(n.id, n)
  }

  for (const a of alerts) {
    let treatment: Treatment = a.resolved_at ? 'tratado' : 'pendente'
    let entity: AlertTreatment['entity'] = null

    if (a.linked_entity_type === 'csm_task' && a.linked_entity_id) {
      const t = taskMap.get(a.linked_entity_id)
      if (t) {
        const done = t.status === 'completed' || !!t.completed_at
        if (done) treatment = 'tratado'
        entity = { type: 'csm_task', label: 'Tarefa', status: done ? 'Concluída' : 'Pendente', href: '/atividades' }
      }
    } else if (a.linked_entity_type === 'support_ticket' && a.linked_entity_id) {
      const t = ticketMap.get(a.linked_entity_id)
      if (t) {
        const done = TICKET_DONE.has(String(t.status).toLowerCase())
        if (done) treatment = 'tratado'
        entity = { type: 'support_ticket', label: 'Chamado', status: t.status ?? null, href: `/suporte/${a.linked_entity_id}` }
      }
    } else if (a.linked_entity_type === 'negotiation' && a.linked_entity_id) {
      const n = negMap.get(a.linked_entity_id)
      if (n) {
        const done = ['closed', 'won', 'lost', 'fechada', 'ganha', 'perdida'].includes(String(n.status).toLowerCase())
        if (done) treatment = 'tratado'
        entity = { type: 'negotiation', label: 'Negociação', status: n.status ?? null, href: null }
      }
    }

    result.set(a.id, { treatment, entity })
  }

  return result
}
