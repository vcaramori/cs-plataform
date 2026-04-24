import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const Schema = z.object({ body: z.string().min(1).max(5000) })

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: ticketId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { error: msgError } = await supabase
    .from('support_ticket_messages')
    .insert({
      ticket_id: ticketId,
      author_id: user.id,
      author_email: user.email,
      type: 'note',
      body: parsed.data.body,
      created_at: new Date().toISOString()
    })

  if (msgError) {
    console.error('[API Notes] Failed to insert message:', msgError)
    return NextResponse.json({ error: 'Failed to save note: ' + msgError.message }, { status: 500 })
  }

  // Also log as SLA event
  await supabase
    .from('sla_events')
    .insert({
      ticket_id: ticketId,
      event_type: 'internal_note',
      occurred_at: new Date().toISOString(),
      metadata: { body: parsed.data.body, author_email: user.email, author_id: user.id }
    })

  // @mention detection — notify mentioned users
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
        source: 'note',
      },
    })
  }

  return NextResponse.json({ success: true })
}
