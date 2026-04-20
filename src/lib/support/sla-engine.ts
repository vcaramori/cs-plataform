import { TicketStatus } from '../supabase/types'

export type SLAStatus = 'no_prazo' | 'atencao' | 'vencido' | 'cumprido' | 'violado'

/**
 * Evaluates the SLA status for a given point in the tickets lifecycle.
 * Applies to both first_response and resolution.
 */
export function evaluateSLAStatus(
  deadline: Date | null,
  attentionAt: Date | null,
  completedAt: Date | null, // first_response_at OR resolved_at
  now: Date
): SLAStatus {
  // If no SLA policy was applied, it has no deadline
  if (!deadline) return 'no_prazo'

  // If already completed, did it meet the deadline?
  if (completedAt) {
    return completedAt.getTime() <= deadline.getTime() ? 'cumprido' : 'violado'
  }

  // Not yet completed.
  if (now.getTime() > deadline.getTime()) {
    return 'vencido'
  }

  if (attentionAt && now.getTime() >= attentionAt.getTime()) {
    // Has not breached deadline, but passed the attention threshold
    return 'atencao'
  }

  return 'no_prazo'
}

/**
 * Helper to determine if a ticket is currently breached.
 */
export function isBreached(deadline: Date | null, now: Date): boolean {
  if (!deadline) return false
  return now.getTime() > deadline.getTime()
}
