import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Indicador de ÁREA: usuários internos veem o total global (não só suas contas).
  const { data: prof } = await supabase.from('profiles').select('user_type').eq('id', user.id).maybeSingle()
  if ((prof as any)?.user_type === 'external') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = getSupabaseAdminClient() as any

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
  const dateTo = searchParams.get('date_to') ?? new Date().toISOString()

  const { data: tickets, error } = await db
    .from('support_tickets')
    .select('id, status, opened_at, resolved_at, first_response_at, first_response_deadline, resolution_deadline, sla_breach_resolution, sla_breach_first_response, first_response_business_minutes, resolution_business_minutes, avg_response_minutes, avg_response_business_minutes, public_message_count, agent_reply_count, accounts!inner(csm_owner_id)')
    .gte('opened_at', dateFrom)
    .lte('opened_at', dateTo)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // cast: colunas *_business_minutes / *_count ainda não estão em database.types
  const all = (tickets ?? []) as any[]
  const resolved = all.filter(t => t.resolved_at)
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : null)

  // TMP — Tempo Médio de Primeira Resposta CORRIDO (minutos, relógio)
  const avgFirstResponseMinutes = avg(all
    .filter(t => t.first_response_at && t.opened_at)
    .map(t => (new Date(t.first_response_at).getTime() - new Date(t.opened_at).getTime()) / 60000))

  // TMR — Tempo Médio de Resolução CORRIDO (minutos, relógio)
  const avgResolutionMinutes = avg(resolved
    .filter(t => t.opened_at)
    .map(t => (new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()) / 60000))

  // TMP/TMR ÚTIL — em horário comercial (SLA), pré-calculado no sync
  const avgFirstResponseBusinessMinutes = avg(all
    .filter(t => typeof t.first_response_business_minutes === 'number')
    .map(t => t.first_response_business_minutes))
  const avgResolutionBusinessMinutes = avg(resolved
    .filter(t => typeof t.resolution_business_minutes === 'number')
    .map(t => t.resolution_business_minutes))

  // Tempo médio de RESPOSTA (solicitante→agente) — corrido e útil (pré-calc por chamado)
  const avgResponseMinutes = avg(all
    .filter(t => typeof t.avg_response_minutes === 'number')
    .map(t => t.avg_response_minutes))
  const avgResponseBusinessMinutes = avg(all
    .filter(t => typeof t.avg_response_business_minutes === 'number')
    .map(t => t.avg_response_business_minutes))

  // Média de INTERAÇÕES (mensagens públicas) necessárias para resolver.
  // Considera só chamados com contagem já processada (>0) — evita "0" falso de chamados
  // antigos ainda sem reprocessamento (chamado real sempre tem >=1 mensagem).
  const processedResolved = resolved.filter(t => (t.public_message_count ?? 0) > 0)
  const avgInteractionsResolved = processedResolved.length ? avg(processedResolved.map(t => t.public_message_count)) : null

  // FCR — % de chamados ENCERRADOS em 1ª resposta (1 única resposta do agente).
  // Base = encerrados JÁ processados (mensagens contadas), pelo mesmo motivo.
  const closedTickets = all.filter(t => (t.status === 'resolved' || t.status === 'closed') && (t.public_message_count ?? 0) > 0)
  const fcrCount = closedTickets.filter(t => (t.agent_reply_count ?? 0) === 1).length
  const fcrPct = closedTickets.length > 0 ? Math.round((fcrCount / closedTickets.length) * 100) : null

  // SLA Compliance
  const withSLA = all.filter(t => t.resolution_deadline)
  const frCompliant = all.filter(t => t.first_response_deadline && !t.sla_breach_first_response).length
  const resCompliant = withSLA.filter(t => !t.sla_breach_resolution).length

  // CSAT
  const { data: csatData } = await db
    .from('csat_responses')
    .select('score')
    .gte('answered_at', dateFrom)
    .lte('answered_at', dateTo)

  const avgCsat = csatData && csatData.length > 0
    ? csatData.reduce((s: number, r: any) => s + r.score, 0) / csatData.length
    : null

  // Reopened
  const { data: reopenEvents } = await db
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
    avg_first_response_minutes: avgFirstResponseMinutes != null ? Math.round(avgFirstResponseMinutes) : null,
    avg_resolution_minutes: avgResolutionMinutes != null ? Math.round(avgResolutionMinutes) : null,
    avg_first_response_business_minutes: avgFirstResponseBusinessMinutes != null ? Math.round(avgFirstResponseBusinessMinutes) : null,
    avg_resolution_business_minutes: avgResolutionBusinessMinutes != null ? Math.round(avgResolutionBusinessMinutes) : null,
    avg_response_minutes: avgResponseMinutes != null ? Math.round(avgResponseMinutes) : null,
    avg_response_business_minutes: avgResponseBusinessMinutes != null ? Math.round(avgResponseBusinessMinutes) : null,
    avg_interactions_resolved: avgInteractionsResolved != null ? Math.round(avgInteractionsResolved * 10) / 10 : null,
    fcr_pct: fcrPct,
    fcr_count: fcrCount,
    closed_count: closedTickets.length,
    avg_csat: avgCsat ? Math.round(avgCsat * 10) / 10 : null,
  })
}
