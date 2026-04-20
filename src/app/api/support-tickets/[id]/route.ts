import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { buildResolutionSLAFreeze, logSLAEvent } from '@/lib/support/lifecycle'
import { sendCSATEmail } from '@/lib/support/csat-service'

const PatchSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'reopened']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  assigned_to: z.string().nullable().optional()
})

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const body = await request.json()

  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  // 1. Get current ticket to know previous state
  const { data: ticket, error: fetchErr } = await supabase
    .from('support_tickets')
    .select('*')
    .eq('id', id)
    .single()

  if (fetchErr || !ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  let updates: any = { ...parsed.data }

  const statusChanged = parsed.data.status && parsed.data.status !== ticket.status
  const isResolving = statusChanged && (parsed.data.status === 'resolved' || parsed.data.status === 'closed')
  const isReopening = statusChanged && parsed.data.status === 'reopened'

  // 2. SLA Freezing Logic
  if (isResolving) {
    updates = { ...updates, ...buildResolutionSLAFreeze(ticket) }
  } else if (isReopening) {
    // If reopened, we clear the resolved_at so the polling engine resumes checking SLA
    // This is optional and depends on business logic, but typically reopening requires new SLAs or re-opening the clock.
    // We'll leave the original deadline but clear resolved_at.
    updates.resolved_at = null
    // Assuming status resets to previous pending state
    updates.sla_status_resolution = ticket.resolution_deadline && new Date() > new Date(ticket.resolution_deadline) ? 'vencido' : 'no_prazo'
  }

  // 3. Update
  const { data: updatedTicket, error: updateErr } = await supabase
    .from('support_tickets')
    .update(updates)
    .eq('id', id)
    .select()
    .single()

  if (updateErr) return NextResponse.json({ error: updateErr.message }, { status: 500 })

  // 4. Fire Async Events
  if (statusChanged) {
    logSLAEvent(id, `ticket_${parsed.data.status}`, { source: 'api_patch' }).catch(console.error)
    
    // Auto-trigger CSAT if resolving
    if (isResolving) {
      sendCSATEmail(id).catch(err => {
        console.error(`[CSAT Trigger] Failed to send email for ticket ${id}:`, err)
      })
    }
  }

  return NextResponse.json(updatedTicket)
}
