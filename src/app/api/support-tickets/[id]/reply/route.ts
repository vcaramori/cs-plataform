import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { processAgentInteraction, logSLAEvent, resolveTicket, closeTicket, reopenTicket } from '@/lib/support/lifecycle'
import { z } from 'zod'

const Schema = z.object({
  body: z.string().min(1).max(10000),
  outcome: z.enum(['solution', 'pending_client', 'pending_product', 'none']).default('none'),
  close_after: z.boolean().optional().default(false),
  // Campos de classificação para persistência tardia
  priority: z.enum(['low', 'medium', 'high', 'critical']).optional(),
  category: z.string().optional(),
  product: z.string().optional(),
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params
  console.log('[API Reply] Processing for ticket:', ticketId)

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { data: ticket } = await supabase
    .from('support_tickets')
    .select('id, status')
    .eq('id', ticketId)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  console.log('[API Reply] Validated ticket:', ticket.id)

  // 0. Update Classification if provided
  const ticketUpdates: any = {}
  if (parsed.data.priority) ticketUpdates.priority = parsed.data.priority
  if (parsed.data.category) ticketUpdates.category = parsed.data.category === 'none' ? null : parsed.data.category
  if (parsed.data.product) ticketUpdates.product = parsed.data.product === 'none' ? null : parsed.data.product

  if (Object.keys(ticketUpdates).length > 0) {
    await supabase.from('support_tickets').update(ticketUpdates).eq('id', ticketId)
  }

  const finalOutcome = parsed.data.outcome === 'none' && parsed.data.close_after
    ? 'solution'
    : parsed.data.outcome

  // 1. Core Lifecycle Interaction
  await processAgentInteraction(
    ticketId,
    user.id,
    parsed.data.body,
    finalOutcome
  )

  // 2. Direct Status Override (from UI select)
  if (body.status && body.status !== ticket.status) {
    if (body.status === 'resolved') {
      await resolveTicket(ticketId)
    } else if (body.status === 'closed') {
      await closeTicket(ticketId, 'manual')
    } else if (body.status === 'reopened') {
      await reopenTicket(ticketId)
    } else {
      await supabase.from('support_tickets').update({ status: body.status }).eq('id', ticketId)
    }
  }

  // 3. Store message in history
  const { error: msgError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_email: user.email,
      type: 'reply',
      body: parsed.data.body,
      created_at: new Date().toISOString()
    })

  if (msgError) {
    console.error('[API Reply] Failed to insert message:', msgError)
  }

  // 3b. @mention detection — notify mentioned users
  const mentionMatches = [...parsed.data.body.matchAll(/@([\w._%+\-]+@[\w.\-]+\.[a-zA-Z]{2,})/g)]
  for (const match of mentionMatches) {
    const mentionedEmail = match[1]
    if (mentionedEmail === user.email) continue
    await supabase.from('sla_events').insert({
      ticket_id: ticketId,
      event_type: 'mention',
      occurred_at: new Date().toISOString(),
      metadata: {
        mentioned_email: mentionedEmail,
        author_email: user.email,
        body_excerpt: parsed.data.body.substring(0, 300),
        source: 'reply',
      },
    })
  }

  // 4. Log Legacy Event
  await logSLAEvent(ticketId, 'agent_reply', {
    body: parsed.data.body,
    author_email: user.email,
    author_id: user.id,
    outcome: finalOutcome,
    classification_updated: Object.keys(ticketUpdates).length > 0
  })

  return NextResponse.json({ success: true })
}
