import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
  const dateTo = searchParams.get('date_to') ?? new Date().toISOString()

  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select('id, status, opened_at, resolved_at, first_response_at, first_response_deadline, resolution_deadline, sla_breach_resolution, sla_breach_first_response, accounts!inner(csm_owner_id)')
    .gte('opened_at', dateFrom)
    .lte('opened_at', dateTo)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const all = tickets ?? []
  const resolved = all.filter(t => t.resolved_at)

  // TMP — Tempo Médio de Primeira Resposta (minutos)
  const frTimes = all
    .filter(t => t.first_response_at && t.opened_at)
    .map(t => (new Date(t.first_response_at!).getTime() - new Date(t.opened_at).getTime()) / 60000)
  const avgFirstResponseMinutes = frTimes.length > 0
    ? frTimes.reduce((a, b) => a + b, 0) / frTimes.length : null

  // TMR — Tempo Médio de Resolução (minutos)
  const resTimes = resolved
    .filter(t => t.opened_at)
    .map(t => (new Date(t.resolved_at!).getTime() - new Date(t.opened_at).getTime()) / 60000)
  const avgResolutionMinutes = resTimes.length > 0
    ? resTimes.reduce((a, b) => a + b, 0) / resTimes.length : null

  // SLA Compliance
  const withSLA = all.filter(t => t.resolution_deadline)
  const frCompliant = all.filter(t => t.first_response_deadline && !t.sla_breach_first_response).length
  const resCompliant = withSLA.filter(t => !t.sla_breach_resolution).length

  // CSAT
  const { data: csatData } = await supabase
    .from('csat_responses')
    .select('score')
    .gte('answered_at', dateFrom)
    .lte('answered_at', dateTo)

  const avgCsat = csatData && csatData.length > 0
    ? csatData.reduce((s, r) => s + r.score, 0) / csatData.length
    : null

  // Reopened
  const { data: reopenEvents } = await supabase
    .from('sla_events')
    .select('id')
    .eq('event_type', 'reopened')
    .gte('occurred_at', dateFrom)
    .lte('occurred_at', dateTo)

  return NextResponse.json({
    tickets_received: all.length,
    tickets_resolved: resolved.length,
    reopened: reopenEvents?.length ?? 0,
    sla_first_response_compliance_pct: all.filter(t => t.first_response_deadline).length > 0
      ? Math.round(frCompliant / all.filter(t => t.first_response_deadline).length * 100) : null,
    sla_resolution_compliance_pct: withSLA.length > 0
      ? Math.round(resCompliant / withSLA.length * 100) : null,
    avg_first_response_minutes: avgFirstResponseMinutes ? Math.round(avgFirstResponseMinutes) : null,
    avg_resolution_minutes: avgResolutionMinutes ? Math.round(avgResolutionMinutes) : null,
    avg_csat: avgCsat ? Math.round(avgCsat * 10) / 10 : null,
  })
}
