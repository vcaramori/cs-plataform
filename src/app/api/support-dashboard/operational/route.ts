import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Indicador de ÁREA: total global para usuários internos.
  const { data: prof } = await supabase.from('profiles').select('user_type').eq('id', user.id).maybeSingle()
  if ((prof as any)?.user_type === 'external') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = getSupabaseAdminClient() as any

  const { data: tickets, error } = await db
    .from('support_tickets')
    .select('id, status, sla_status_resolution, sla_status_first_response')
    .in('status', ['open', 'in_progress', 'reopened', 'resolved'])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = (tickets ?? []) as any[]

  return NextResponse.json({
    open_now: all.filter((t: any) => ['open', 'in_progress', 'reopened'].includes(t.status)).length,
    sla_breached: all.filter((t: any) => t.sla_status_resolution === 'vencido' || t.sla_status_first_response === 'vencido').length,
    sla_attention: all.filter((t: any) => t.sla_status_resolution === 'atencao' || t.sla_status_first_response === 'atencao').length,
    awaiting_close: all.filter((t: any) => t.status === 'resolved').length,
  })
}
