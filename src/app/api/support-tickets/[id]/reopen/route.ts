import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const ReopenSchema = z.object({
  reason: z.string().min(10, 'Minimum 10 characters').max(1000, 'Maximum 1000 characters')
})

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()

  // 1. Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 2. Validate input
  const body = await request.json()
  const parsed = ReopenSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
  }

  // 3. Get ticket
  const { data: ticket, error: fetchErr } = await admin
    .from('support_tickets')
    .select('id, status, account_id')
    .eq('id', id)
    .single()

  if (fetchErr || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // 4. Verify ticket is closed
  if (ticket.status !== 'closed') {
    return NextResponse.json(
      { error: 'Only closed tickets can be reopened' },
      { status: 400 }
    )
  }

  // 5. Update status to open
  const { error: updateErr } = await admin
    .from('support_tickets')
    .update({
      status: 'open',
      resolved_at: null,
      sla_status_resolution: 'no_prazo',
      closed_at: null
    })
    .eq('id', id)

  if (updateErr) {
    return NextResponse.json({ error: updateErr.message }, { status: 500 })
  }

  // 6. Log event in ticket_events
  try {
    await admin.from('ticket_events').insert({
      ticket_id: id,
      event_type: 'manual_reopened',
      payload: {
        reason: parsed.data.reason,
        reopened_by: user.id,
        reopened_by_email: user.email,
        reopened_at: new Date().toISOString()
      },
      triggered_by: user.id
    })
  } catch (err) {
    console.error(`[Reopen] Failed to log event for ticket ${id}:`, err)
  }

  return NextResponse.json({
    success: true,
    ticket_id: id,
    message: 'Ticket reopened successfully'
  })
}
