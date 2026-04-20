import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { processAgentInteraction, logSLAEvent } from '@/lib/support/lifecycle'
import { z } from 'zod'

const Schema = z.object({
  body: z.string().min(1).max(10000),
  outcome: z.enum(['solution', 'pending_client', 'pending_product', 'none']).default('none'),
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

  const finalOutcome = parsed.data.outcome === 'none' && parsed.data.close_after 
    ? 'solution' 
    : parsed.data.outcome

  // 1. Core Lifecycle Interaction
  await processAgentInteraction(
    ticketId,
    user.id,
    parsed.data.body,
    finalOutcome
  ).catch(console.error)

  // 2. Store message in history
  const { error: msgError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_email: user.email,
      type: 'reply',
      body: parsed.data.body,
    })

  if (msgError) {
    console.error('[API Reply] Failed to insert message:', msgError)
  }

  // 3. Log Legacy Event
  await logSLAEvent(ticketId, 'agent_reply', {
    body: parsed.data.body,
    author_email: user.email,
    author_id: user.id,
    outcome: finalOutcome
  })

  return NextResponse.json({ success: true })
}
