import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, status, sla_status_resolution, sla_status_first_response, accounts!inner(csm_owner_id)')
    .in('status', ['open', 'in_progress', 'reopened', 'resolved'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = tickets ?? []

  return NextResponse.json({
    open_now: all.filter(t => ['open', 'in_progress', 'reopened'].includes(t.status)).length,
    sla_breached: all.filter(t => t.sla_status_resolution === 'vencido' || t.sla_status_first_response === 'vencido').length,
    sla_attention: all.filter(t => t.sla_status_resolution === 'atencao' || t.sla_status_first_response === 'atencao').length,
    awaiting_close: all.filter(t => t.status === 'resolved').length,
  })
}
