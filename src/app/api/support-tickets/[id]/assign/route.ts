import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logSLAEvent } from '@/lib/support/lifecycle'
import { z } from 'zod'

const Schema = z.object({ user_id: z.string().uuid() })

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const admin = getSupabaseAdminClient()
  const { data: ticket } = await admin
    .from('support_tickets')
    .select('id, assigned_to')
    .eq('id', id)
    .single()

  if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })

  // 1. Update Ticket
  await admin.from('support_tickets').update({ assigned_to: parsed.data.user_id }).eq('id', id)

  // 2. Log SLA Event
  await logSLAEvent(id, 'assigned', {
    from: ticket.assigned_to,
    to: parsed.data.user_id,
    by: user.id
  })

  // 3. Create Notification
  await admin.from('notifications').insert({
    user_id: parsed.data.user_id,
    type: 'ticket_reassigned',
    message: `Ticket #${id.substring(0, 8)} reatribuído para você`,
    metadata: { ticket_id: id, reassigned_by: user.id },
    read: false,
    created_at: new Date().toISOString()
  })

  return NextResponse.json({ success: true })
}
