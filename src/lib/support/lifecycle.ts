import { getPolicyForAccount, getBusinessHoursForAccount, resolveInternalLevel } from './sla-policies'
import { calculateAttentionDeadline, calculateDeadline } from './business-hours'
import { evaluateSLAStatus } from './sla-engine'
import { getSupabaseAdminClient as createAdminClient } from '../supabase/admin'
import { sendCSATEmail } from './csat-service'
import { analyzeAgentReply } from './ai-reply-analyzer'

/**
 * Enriches a new ticket payload with SLA deadlines before insertion.
 * Expects priority or external_label and account_id.
 */
export async function enrichTicketWithSLA(payload: any): Promise<any> {
  // Priority: Specific Contract Policy > Account Default Policy
  const policy = await getPolicyForAccount(payload.account_id, payload.contract_id)
  if (!policy) return payload

  const internalLevel = resolveInternalLevel(
    payload.external_priority_label || payload.priority, 
    policy.mappings,
    payload.category
  )
  const levelSettings = policy.levels.find(l => l.level === internalLevel)

  if (!levelSettings) return { ...payload, sla_policy_id: policy.id, internal_level: internalLevel }

  const hours = await getBusinessHoursForAccount(payload.account_id)
  const openedAt = payload.opened_at ? new Date(payload.opened_at) : new Date()

  const firstResDeadline = calculateDeadline(openedAt, levelSettings.first_response_minutes, policy.timezone, hours)
  const firstResAttention = calculateAttentionDeadline(openedAt, levelSettings.first_response_minutes, policy.alert_threshold_pct, policy.timezone, hours)

  const resDeadline = calculateDeadline(openedAt, levelSettings.resolution_minutes, policy.timezone, hours)
  const resAttention = calculateAttentionDeadline(openedAt, levelSettings.resolution_minutes, policy.alert_threshold_pct, policy.timezone, hours)

  return {
    ...payload,
    sla_policy_id: policy.id,
    internal_level: internalLevel,
    first_response_deadline: firstResDeadline.toISOString(),
    first_response_attention_at: firstResAttention.toISOString(),
    resolution_deadline: resDeadline.toISOString(),
    resolution_attention_at: resAttention.toISOString(),
    sla_status_first_response: 'no_prazo',
    sla_status_resolution: 'no_prazo',
    sla_breach_first_response: false,
    sla_breach_resolution: false
  }
}

export async function logSLAEvent(ticketId: string, eventType: string, metadata?: any) {
  const supabase = createAdminClient()
  await supabase.from('sla_events').insert({
    ticket_id: ticketId,
    event_type: eventType,
    occurred_at: new Date().toISOString(),
    metadata: metadata || null
  })
}

export function buildResolutionSLAFreeze(ticket: any) {
  if (!ticket.sla_policy_id) return {}

  const now = new Date()
  const deadline = ticket.resolution_deadline ? new Date(ticket.resolution_deadline) : null
  const breached = deadline ? now.getTime() > deadline.getTime() : false

  return {
    resolved_at: now.toISOString(),
    sla_status_resolution: breached ? 'violado' : 'cumprido',
    sla_breach_resolution: breached
  }
}

/**
 * Called when a new ticket is created. Logs 'opened' event and sets assigned_to.
 */
export async function openTicket(ticketId: string, openedAt?: Date): Promise<void> {
  const supabase = createAdminClient()
  const defaultAssignee = process.env.SUPPORT_DEFAULT_ASSIGNEE_ID

  const updates: any = {}
  if (defaultAssignee) {
    updates.assigned_to = defaultAssignee
    updates.first_assigned_to = defaultAssignee
  }

  if (Object.keys(updates).length > 0) {
    await supabase.from('support_tickets').update(updates).eq('id', ticketId)
  }

  await logSLAEvent(ticketId, 'opened', {
    opened_at: (openedAt ?? new Date()).toISOString(),
    assigned_to: defaultAssignee ?? null
  })

  if (defaultAssignee) {
    await createNotification(defaultAssignee, 'new_ticket', ticketId, 'Novo ticket de suporte atribuído a você')
  }
}

/**
 * Called when an agent first responds to an open ticket.
 * Transitions to in_progress and freezes the first-response SLA.
 */
export async function recordFirstResponse(ticketId: string, respondedAt?: Date): Promise<void> {
  const supabase = createAdminClient()
  const now = respondedAt ?? new Date()

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('first_response_deadline, first_response_at')
    .eq('id', ticketId)
    .single()

  if (!ticket || ticket.first_response_at) return // Already recorded

  const deadline = ticket.first_response_deadline ? new Date(ticket.first_response_deadline) : null
  const met = deadline ? now.getTime() <= deadline.getTime() : true

  await supabase.from('support_tickets').update({
    first_response_at: now.toISOString(),
    status: 'in_progress',
    sla_status_first_response: met ? 'cumprido' : 'violado',
    sla_breach_first_response: !met
  }).eq('id', ticketId)

  await logSLAEvent(ticketId, 'first_response', {
    responded_at: now.toISOString(),
    met_sla: met
  })
}

/**
 * Resolves a ticket: freezes resolution SLA, logs event, sends CSAT.
 */
export async function resolveTicket(ticketId: string, resolvedAt?: Date): Promise<void> {
  const supabase = createAdminClient()

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', ticketId)
    .single()

  if (!ticket) return

  const freeze = buildResolutionSLAFreeze({ ...ticket, resolved_at: null })
  const resolvedAtStr = (resolvedAt ?? new Date()).toISOString()

  await supabase.from('support_tickets').update({
    status: 'resolved',
    ...freeze,
    resolved_at: resolvedAtStr
  }).eq('id', ticketId)

  await logSLAEvent(ticketId, 'resolved', {
    resolved_at: resolvedAtStr,
    sla_met: !freeze.sla_breach_resolution
  })

  // Fire CSAT email without blocking resolution flow
  sendCSATEmail(ticketId).catch(err =>
    console.error(`[Lifecycle] CSAT email failed for ticket ${ticketId}:`, err)
  )
}

/**
 * High-level orchestrator for agent replies.
 * Handles automatic first-response and pending states.
 */
export async function processAgentInteraction(
  ticketId: string, 
  userId: string, 
  body: string, 
  outcome: 'solution' | 'pending_client' | 'pending_product' | 'none'
): Promise<void> {
  const supabase = createAdminClient()
  
  // 1. Record first response if needed
  await recordFirstResponse(ticketId)

  // 2. Handle Outcome
  if (outcome === 'solution') {
    await resolveTicket(ticketId)
  } else if (outcome === 'pending_client' || outcome === 'pending_product') {
    const reason = outcome === 'pending_client' ? 'client' : 'product'
    
    // Defensive: try updating, catch if column doesn't exist
    const { error } = await supabase.from('support_tickets').update({
      status: 'in_progress',
      pending_reason: reason
    }).eq('id', ticketId)
    
    if (error && error.code === '42703') { // undefined_column
      console.warn('[Lifecycle] Column pending_reason missing, updating status only.')
      await supabase.from('support_tickets').update({ status: 'in_progress' }).eq('id', ticketId)
    }
    
    await logSLAEvent(ticketId, `pending_${reason}`, { body: body.substring(0, 100) })
  } else {
    // Normal reply - ensure no longer pending if column exists
    await supabase.from('support_tickets').update({
      pending_reason: 'none'
    }).eq('id', ticketId)
  }

  // 3. AI Analysis for promised follow-up
  const analysis = await analyzeAgentReply(body)
  if (analysis.promised_at) {
    await scheduleFollowUp(ticketId, userId, analysis.promised_at, analysis.reasoning)
  }
}

async function scheduleFollowUp(ticketId: string, userId: string, targetTime: string, reason: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('support_schedules').insert({
    ticket_id: ticketId,
    created_by: userId,
    target_time: targetTime,
    reason: reason
  })
}

/**
 * Reopens a resolved ticket. Keeps original resolution_deadline (does not restart).
 */
export async function reopenTicket(ticketId: string): Promise<void> {
  const supabase = createAdminClient()

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('assigned_to, resolution_deadline')
    .eq('id', ticketId)
    .single()

  if (!ticket) return

  const now = new Date()
  const deadline = ticket.resolution_deadline ? new Date(ticket.resolution_deadline) : null
  const resStatus = deadline && now > deadline ? 'vencido' : 'no_prazo'

  await supabase.from('support_tickets').update({
    status: 'reopened',
    resolved_at: null,
    sla_status_resolution: resStatus
  }).eq('id', ticketId)

  await logSLAEvent(ticketId, 'reopened', { reopened_at: now.toISOString() })

  if (ticket.assigned_to) {
    await createNotification(ticket.assigned_to, 'ticket_reopened', ticketId, 'Ticket reaberto pelo cliente')
  }
}

/**
 * Closes a ticket.
 */
export async function closeTicket(ticketId: string, reason: 'auto_timeout' | 'gratitude' | 'manual'): Promise<void> {
  const supabase = createAdminClient()
  const now = new Date()

  await supabase.from('support_tickets').update({
    status: 'closed',
    closed_at: now.toISOString()
  }).eq('id', ticketId)

  await logSLAEvent(ticketId, 'closed', { reason, closed_at: now.toISOString() })
}

/**
 * Creates a new ticket from a closed one (when client replies after closure).
 */
export async function createFromClosed(parentTicketId: string, newTicketData: any): Promise<string | null> {
  const supabase = createAdminClient()

  const enriched = await enrichTicketWithSLA({
    ...newTicketData,
    parent_ticket_id: parentTicketId
  })

  const { data: newTicket, error } = await supabase
    .from('support_tickets')
    .insert(enriched)
    .select('id')
    .single()

  if (error || !newTicket) {
    console.error('[Lifecycle] Failed to create ticket from closed:', error)
    return null
  }

  await logSLAEvent(parentTicketId, 'new_from_closed', { new_ticket_id: newTicket.id })
  await openTicket(newTicket.id)

  return newTicket.id
}

/**
 * Recalculates SLA deadlines for all open tickets in an account.
 * Called when SLA policy is created/updated to backfill existing tickets.
 */
export async function recalculateSLAForAccount(accountId: string): Promise<number> {
  const supabase = createAdminClient()
  const policy = await getPolicyForAccount(accountId)

  if (!policy) return 0

  const { data: openTickets, error } = await supabase
    .from('support_tickets')
    .select('id, opened_at, internal_level, contract_id')
    .eq('account_id', accountId)
    .in('status', ['open', 'in_progress'])

  if (error || !openTickets) {
    console.error('[Lifecycle] Error fetching open tickets for SLA recalc:', error)
    return 0
  }

  const hours = await getBusinessHoursForAccount(accountId)
  let updated = 0

  for (const ticket of openTickets) {
    const level = ticket.internal_level || 'medium'
    const levelSettings = policy.levels.find(l => l.level === level)

    if (!levelSettings) continue

    const openedAt = new Date(ticket.opened_at)
    const firstResDeadline = calculateDeadline(openedAt, levelSettings.first_response_minutes, policy.timezone, hours)
    const firstResAttention = calculateAttentionDeadline(openedAt, levelSettings.first_response_minutes, policy.alert_threshold_pct, policy.timezone, hours)
    const resDeadline = calculateDeadline(openedAt, levelSettings.resolution_minutes, policy.timezone, hours)
    const resAttention = calculateAttentionDeadline(openedAt, levelSettings.resolution_minutes, policy.alert_threshold_pct, policy.timezone, hours)

    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        sla_policy_id: policy.id,
        first_response_deadline: firstResDeadline.toISOString(),
        first_response_attention_at: firstResAttention.toISOString(),
        resolution_deadline: resDeadline.toISOString(),
        resolution_attention_at: resAttention.toISOString(),
        sla_status_first_response: 'no_prazo',
        sla_status_resolution: 'no_prazo',
        sla_breach_first_response: false,
        sla_breach_resolution: false
      })
      .eq('id', ticket.id)

    if (!updateError) updated++
  }

  console.log(`[Lifecycle] Recalculated SLA for ${updated}/${openTickets.length} tickets in account ${accountId}`)
  return updated
}

async function createNotification(userId: string, type: string, ticketId: string, message: string): Promise<void> {
  const supabase = createAdminClient()
  await supabase.from('notifications').insert({
    user_id: userId,
    type,
    message,
    metadata: { ticket_id: ticketId },
    read: false,
    created_at: new Date().toISOString()
  })
}
