import { getSupabaseAdminClient as createAdminClient } from '@/lib/supabase/admin'
import { closeTicket } from './lifecycle'

/**
 * Scans for resolved tickets that have exceeded their auto-close threshold.
 * This should be called by a cron job (/api/cron/ticket-auto-close).
 */
export async function runAutoClose(): Promise<{ closedCount: number }> {
  const supabase = createAdminClient()
  const now = new Date()

  // 1. Fetch resolved tickets with their policies
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select(`
      id,
      resolved_at,
      sla_policies(auto_close_hours)
    `)
    .eq('status', 'resolved')
    .not('resolved_at', 'is', null)

  if (error || !tickets) {
    console.error('[Auto-Close] Failed to fetch resolved tickets:', error)
    return { closedCount: 0 }
  }

  let closedCount = 0

  for (const ticket of tickets) {
    const resolvedAt = new Date(ticket.resolved_at!)
    const policyHours = (ticket.sla_policies as any)?.auto_close_hours ?? 48 // Default 48h
    
    const timeoutMs = policyHours * 60 * 60 * 1000
    const elapsedMs = now.getTime() - resolvedAt.getTime()

    if (elapsedMs >= timeoutMs) {
      console.log(`[Auto-Close] Closing ticket ${ticket.id} due to inactivity (${policyHours}h threshold).`)
      await closeTicket(ticket.id, 'auto_timeout')
      closedCount++
    }
  }

  return { closedCount }
}
