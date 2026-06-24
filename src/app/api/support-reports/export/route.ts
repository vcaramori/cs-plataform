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
      .select('*, accounts!inner(name)')
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

  // Rótulos amigáveis para as colunas conhecidas; as demais saem com o nome bruto da coluna
  // (garante que TODOS os campos do chamado sejam exportados).
  const COLUMN_LABELS: Record<string, string> = {
    id: 'ID', external_ticket_id: 'Ticket Externo', external_id: 'ID Externo',
    title: 'Título', description: 'Descrição', thread_content: 'Thread (e-mail)', summary: 'Resumo',
    status: 'Status', priority: 'Prioridade', internal_level: 'Nível SLA',
    external_priority_label: 'Rótulo de Prioridade (externo)', category: 'Categoria',
    suggested_category: 'Categoria sugerida (IA)', product: 'Produto',
    resolution_notes: 'Detalhamento (bug/operação)', source: 'Origem',
    opened_at: 'Aberto em', first_response_at: '1ª Resposta em', resolved_at: 'Resolvido em',
    closed_at: 'Fechado em', created_at: 'Criado em',
    first_response_deadline: 'Deadline 1ª Resposta', resolution_deadline: 'Deadline Resolução',
    first_response_attention_at: 'Atenção 1ª Resposta', resolution_attention_at: 'Atenção Resolução',
    sla_breach_first_response: 'SLA 1ª Resp. Violado', sla_breach_resolution: 'SLA Resolução Violado',
    sla_status_first_response: 'Status SLA 1ª Resp.', sla_status_resolution: 'Status SLA Resolução',
    sla_policy_id: 'Política SLA (ID)', assigned_to: 'Responsável (ID)', first_assigned_to: '1º Responsável (ID)',
    parent_ticket_id: 'Ticket Pai (ID)', contract_id: 'Contrato (ID)',
    merged_into: 'Mesclado em (ID)', merged_at: 'Mesclado em (data)', merge_count: 'Qtd. Mesclagens',
    pending_reason: 'Motivo Pendência', urgency_score: 'Urgência (IA)', urgency_scored_at: 'Urgência avaliada em',
    requester_email: 'E-mail Solicitante', avg_response_minutes: 'Tempo médio de resposta (min)',
    avg_response_business_minutes: 'Tempo médio resposta úteis (min)', account_id: 'Conta (ID)',
  }

  // Aba 1: Tickets — TODAS as colunas + cliente + CSAT
  const ticketsSheet = (tickets ?? []).map(t => {
    const { accounts, ...cols } = t as any
    const csatRow = csatMap.get(t.id)
    const row: Record<string, any> = { 'Cliente': accounts?.name ?? '' }
    for (const [key, value] of Object.entries(cols)) {
      const label = COLUMN_LABELS[key] ?? key
      row[label] = typeof value === 'boolean' ? (value ? 'Sim' : 'Não') : (value ?? '')
    }
    row['CSAT Score'] = csatRow?.score ?? ''
    row['CSAT Comentário'] = csatRow?.comment ?? ''
    return row
  })

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
