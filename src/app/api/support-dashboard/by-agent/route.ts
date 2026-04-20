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
    .select('id, status, assigned_to, opened_at, resolved_at, first_response_at, sla_breach_resolution, sla_breach_first_response, first_response_deadline, resolution_deadline, accounts!inner(csm_owner_id)')
    .gte('opened_at', dateFrom)
    .lte('opened_at', dateTo)
    .not('assigned_to', 'is', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: csatData } = await supabase
    .from('csat_responses')
    .select('score, agent_id')
    .gte('answered_at', dateFrom)
    .lte('answered_at', dateTo)

  // Group by agent
  const agentMap = new Map<string, {
    received: number; resolved: number; frTotal: number; frCount: number;
    resTotal: number; resCount: number; frBreached: number; resBreached: number;
    frWithSLA: number; resWithSLA: number; csatScores: number[]
  }>()

  for (const t of tickets ?? []) {
    const agentId = t.assigned_to!
    if (!agentMap.has(agentId)) {
      agentMap.set(agentId, {
        received: 0, resolved: 0, frTotal: 0, frCount: 0,
        resTotal: 0, resCount: 0, frBreached: 0, resBreached: 0,
        frWithSLA: 0, resWithSLA: 0, csatScores: []
      })
    }
    const a = agentMap.get(agentId)!
    a.received++
    if (t.resolved_at) {
      a.resolved++
      a.resTotal += new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()
      a.resCount++
    }
    if (t.first_response_at) {
      a.frTotal += new Date(t.first_response_at).getTime() - new Date(t.opened_at).getTime()
      a.frCount++
    }
    if (t.first_response_deadline) {
      a.frWithSLA++
      if (t.sla_breach_first_response) a.frBreached++
    }
    if (t.resolution_deadline) {
      a.resWithSLA++
      if (t.sla_breach_resolution) a.resBreached++
    }
  }

  for (const c of csatData ?? []) {
    if (c.agent_id && agentMap.has(c.agent_id)) {
      agentMap.get(c.agent_id)!.csatScores.push(c.score)
    }
  }

  const result = Array.from(agentMap.entries()).map(([agentId, a]) => ({
    agent_id: agentId,
    received: a.received,
    resolved: a.resolved,
    avg_first_response_minutes: a.frCount > 0 ? Math.round(a.frTotal / a.frCount / 60000) : null,
    avg_resolution_minutes: a.resCount > 0 ? Math.round(a.resTotal / a.resCount / 60000) : null,
    fr_compliance_pct: a.frWithSLA > 0 ? Math.round((1 - a.frBreached / a.frWithSLA) * 100) : null,
    res_compliance_pct: a.resWithSLA > 0 ? Math.round((1 - a.resBreached / a.resWithSLA) * 100) : null,
    avg_csat: a.csatScores.length > 0
      ? Math.round(a.csatScores.reduce((s, v) => s + v, 0) / a.csatScores.length * 10) / 10 : null,
  }))

  return NextResponse.json({ agents: result })
}
