import { getSupabaseAdminClient } from '../supabase/admin'
import { evaluateSLAStatus, SLAStatus } from './sla-engine'

async function notify(userId: string, type: string, ticketId: string, message: string) {
  const supabase = getSupabaseAdminClient() as any
  try {
    await supabase.from('notifications').insert({
      user_id: userId,
      type,
      message,
      metadata: { ticket_id: ticketId },
      read: false,
      created_at: new Date().toISOString()
    })
  } catch (err) {
    console.error('[Polling] Notification insert failed:', err)
  }
}

export async function runSLAPolling(): Promise<{ updated: number; notified: number }> {
  const supabase = getSupabaseAdminClient() as any
  let updatedCount = 0
  let notifiedCount = 0

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('*')
    .in('status', ['open', 'in_progress', 'reopened'])
    .not('sla_policy_id', 'is', null)

  if (error || !tickets) {
    console.error('[SLA Polling] Failed to fetch open tickets', error)
    return { updated: 0, notified: 0 }
  }

  const now = new Date()
  const headUserId = process.env.SUPPORT_HEAD_USER_ID

  for (const rawTicket of tickets) {
    const ticket = rawTicket as any

    const currentFrStatus = ticket.sla_status_first_response as SLAStatus | null
    const frNewStatus = evaluateSLAStatus(
      ticket.first_response_deadline ? new Date(ticket.first_response_deadline) : null,
      ticket.first_response_attention_at ? new Date(ticket.first_response_attention_at) : null,
      ticket.first_response_at ? new Date(ticket.first_response_at) : null,
      now
    )

    const currentResStatus = ticket.sla_status_resolution as SLAStatus | null
    const resNewStatus = evaluateSLAStatus(
      ticket.resolution_deadline ? new Date(ticket.resolution_deadline) : null,
      ticket.resolution_attention_at ? new Date(ticket.resolution_attention_at) : null,
      null,
      now
    )

    const frChanged = currentFrStatus !== frNewStatus
    const resChanged = currentResStatus !== resNewStatus

    if (frChanged || resChanged) {
      const updates: any = {}
      if (frChanged) {
        updates.sla_status_first_response = frNewStatus
        if (frNewStatus === 'vencido') updates.sla_breach_first_response = true
      }
      if (resChanged) {
        updates.sla_status_resolution = resNewStatus
        if (resNewStatus === 'vencido') updates.sla_breach_resolution = true
      }

      const { error: updateError } = await supabase
        .from('support_tickets')
        .update(updates)
        .eq('id', ticket.id)

      if (!updateError) {
        updatedCount++

        const assignee = ticket.assigned_to

        // Notificação: SLA atenção (resolução)
        if (resChanged && resNewStatus === 'atencao' && assignee) {
          await notify(assignee, 'sla_attention', ticket.id, `SLA próximo do vencimento: ${ticket.title}`)
          notifiedCount++
        }

        // Notificação: SLA vencido (resolução)
        if (resChanged && resNewStatus === 'vencido') {
          if (assignee) {
            await notify(assignee, 'sla_breached', ticket.id, `SLA de resolução vencido: ${ticket.title}`)
            notifiedCount++
          }
          // Também notifica o default assignee (Laís) se diferente
          const defaultAssignee = process.env.SUPPORT_DEFAULT_ASSIGNEE_ID
          if (defaultAssignee && defaultAssignee !== assignee) {
            await notify(defaultAssignee, 'sla_breached', ticket.id, `SLA de resolução vencido: ${ticket.title}`)
            notifiedCount++
          }
        }

        // Notificação: SLA atenção (primeira resposta)
        if (frChanged && frNewStatus === 'atencao' && assignee) {
          await notify(assignee, 'sla_attention', ticket.id, `Prazo de 1ª resposta próximo: ${ticket.title}`)
          notifiedCount++
        }
      } else {
        console.error(`[SLA Polling] Failed to update ticket ${ticket.id}`, updateError)
      }
    }
  }

  return { updated: updatedCount, notified: notifiedCount }
}
