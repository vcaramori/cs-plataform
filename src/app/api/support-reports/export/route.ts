import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import * as XLSX from 'xlsx'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
  const dateTo = searchParams.get('date_to') ?? new Date().toISOString()

  const [{ data: tickets }, { data: csat }] = await Promise.all([
    supabase
      .from('support_tickets')
      .select('id, title, status, priority, internal_level, category, opened_at, resolved_at, closed_at, first_response_at, first_response_deadline, resolution_deadline, sla_breach_first_response, sla_breach_resolution, assigned_to, accounts!inner(name)')
      .gte('opened_at', dateFrom)
      .lte('opened_at', dateTo)
      .order('opened_at', { ascending: false }),
    supabase
      .from('csat_responses')
      .select('ticket_id, score, comment, answered_at, account_id')
      .gte('answered_at', dateFrom)
      .lte('answered_at', dateTo)
  ])

  const csatMap = new Map((csat ?? []).map(c => [c.ticket_id, c]))

  // Aba 1: Tickets
  const ticketsSheet = (tickets ?? []).map(t => ({
    'ID': t.id,
    'Título': t.title,
    'Status': t.status,
    'Prioridade': t.priority,
    'Nível SLA': t.internal_level ?? '',
    'Categoria': t.category ?? '',
    'Cliente': (t.accounts as any)?.name ?? '',
    'Aberto em': t.opened_at,
    'Resolvido em': t.resolved_at ?? '',
    'Fechado em': t.closed_at ?? '',
    '1ª Resposta em': t.first_response_at ?? '',
    'Deadline 1ª Resposta': t.first_response_deadline ?? '',
    'Deadline Resolução': t.resolution_deadline ?? '',
    'SLA 1ª Resp. Violado': t.sla_breach_first_response ? 'Sim' : 'Não',
    'SLA Resolução Violado': t.sla_breach_resolution ? 'Sim' : 'Não',
    'CSAT Score': csatMap.get(t.id)?.score ?? '',
    'CSAT Comentário': csatMap.get(t.id)?.comment ?? '',
  }))

  // Aba 2: KPIs do período
  const total = tickets?.length ?? 0
  const resolved = tickets?.filter(t => t.resolved_at).length ?? 0
  const withSLA = tickets?.filter(t => t.resolution_deadline).length ?? 0
  const breached = tickets?.filter(t => t.sla_breach_resolution).length ?? 0
  const avgCsat = csat && csat.length > 0
    ? (csat.reduce((s, c) => s + c.score, 0) / csat.length).toFixed(1) : 'N/A'

  const kpisSheet = [
    { 'Métrica': 'Tickets recebidos', 'Valor': total },
    { 'Métrica': 'Tickets resolvidos', 'Valor': resolved },
    { 'Métrica': 'Com SLA configurado', 'Valor': withSLA },
    { 'Métrica': 'Violações de SLA resolução', 'Valor': breached },
    { 'Métrica': 'Compliance SLA (%)', 'Valor': withSLA > 0 ? Math.round((1 - breached / withSLA) * 100) : 'N/A' },
    { 'Métrica': 'CSAT médio', 'Valor': avgCsat },
    { 'Métrica': 'Respostas CSAT', 'Valor': csat?.length ?? 0 },
    { 'Métrica': 'Período de', 'Valor': dateFrom },
    { 'Métrica': 'Período até', 'Valor': dateTo },
  ]

  // Aba 3: Desempenho por agente (simplified)
  const agentMap = new Map<string, { received: number; resolved: number }>()
  for (const t of tickets ?? []) {
    if (!t.assigned_to) continue
    const a = agentMap.get(t.assigned_to) ?? { received: 0, resolved: 0 }
    a.received++
    if (t.resolved_at) a.resolved++
    agentMap.set(t.assigned_to, a)
  }
  const agentsSheet = Array.from(agentMap.entries()).map(([id, a]) => ({
    'ID Agente': id,
    'Recebidos': a.received,
    'Resolvidos': a.resolved,
  }))

  const wb = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(ticketsSheet), 'Tickets')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(kpisSheet), 'KPIs')
  XLSX.utils.book_append_sheet(wb, XLSX.utils.json_to_sheet(agentsSheet.length > 0 ? agentsSheet : [{ '': 'Sem dados' }]), 'Agentes')

  const buffer = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' })

  return new NextResponse(buffer, {
    headers: {
      'Content-Type': 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'Content-Disposition': `attachment; filename="suporte-${dateFrom.slice(0, 10)}-${dateTo.slice(0, 10)}.xlsx"`
    }
  })
}
