import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'
import { buildResolutionSLAFreeze, logSLAEvent } from '@/lib/support/lifecycle'
import { sendCSATEmail } from '@/lib/support/csat-service'
import { runAutomatedAccountAnalysis } from '@/lib/ai/automated-account-analysis'
import { sendPortalTicketStatusEmail } from '@/lib/email/portal-emails'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const PatchSchema = z.object({
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'reopened']).optional(),
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().nullable().optional(),
  product: z.string().nullable().optional(),
  internal_level: z.string().nullable().optional(),
  assigned_to: z.string().nullable().optional(),
  contract_id: z.string().uuid().nullable().optional()
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('*, accounts(name)')
    .eq('id', id)
    .single()

  if (ticketError || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  const { data: messages, error: messageError } = await supabase
    .from('support_ticket_messages')
    .select('*')
    .eq('ticket_id', id)
    .order('created_at', { ascending: true })

  if (messageError) {
    return NextResponse.json({ error: messageError.message }, { status: 500 })
  }

  return NextResponse.json({ ticket, messages: messages || [] })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
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

    // Notifica usuários do portal com acesso aprovado na conta
    if (ticket.account_id && parsed.data.status) {
      const newStatus = parsed.data.status
      const ticketRef = updatedTicket.external_ticket_id ?? `#${id.slice(0, 8).toUpperCase()}`
      ;(async () => {
        try {
          const admin = getSupabaseAdminClient() as any
          const { data: portalUsers } = await admin
            .from('profiles')
            .select('id, full_name')
            .eq('account_id', ticket.account_id)
            .eq('user_type', 'external')
            .not('portal_approved_at', 'is', null)

          if (!portalUsers?.length) return

          const { data: accountRow } = await admin.from('accounts').select('name').eq('id', ticket.account_id).single()
          const accountName = accountRow?.name ?? ''

          for (const pu of portalUsers) {
            const { data: authUser } = await admin.auth.admin.getUserById(pu.id)
            const email = authUser?.user?.email
            if (!email) continue
            sendPortalTicketStatusEmail({
              to: email,
              contactName: pu.full_name ?? email,
              accountName,
              ticketTitle: updatedTicket.title,
              ticketRef,
              newStatus,
              ticketId: id,
            }).catch(console.error)
          }
        } catch (err) {
          console.error('[PortalTicketEmail] Error:', err)
        }
      })()
    }

    // Auto-trigger CSAT if resolving
    if (isResolving) {
      sendCSATEmail(id).catch(err => {
        console.error(`[CSAT Trigger] Failed to send email for ticket ${id}:`, err)
      })
      // Trigger Shadow Score AI — chamado fechado é sinal forte de impacto na saúde
      if (ticket.account_id) {
        runAutomatedAccountAnalysis(ticket.account_id, user?.id, 'ticket_close_trigger').catch(err => {
          console.error(`[Background AI] Shadow Score error on ticket close ${id}:`, err)
        })
      }
    }
  }

  return NextResponse.json(updatedTicket)
}
