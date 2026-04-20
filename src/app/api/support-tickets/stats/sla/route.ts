import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Base query: only tickets for accounts owned by this CSM
  const { data: tickets, error } = await supabase
    .from('support_tickets')
    .select(`
      id,
      priority,
      status,
      sla_status_first_response,
      sla_status_resolution,
      sla_breach_first_response,
      sla_breach_resolution,
      opened_at,
      resolved_at,
      internal_level,
      accounts!inner(csm_owner_id)
    `)
    .eq('accounts.csm_owner_id', user.id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // CSAT Stats
  const { data: csatData } = await supabase
    .from('csat_responses')
    .select('score, account_id, accounts!inner(csm_owner_id)')
    .eq('accounts.csm_owner_id', user.id)

  const totalTickets = tickets.length
  const resolvedTickets = tickets.filter(t => t.status === 'resolved' || t.status === 'closed').length
  
  const metFirstResponse = tickets.filter(t => t.sla_status_first_response === 'cumprido' || t.sla_status_first_response === 'no_prazo').length
  const breachedFirstResponse = tickets.filter(t => t.sla_breach_first_response === true).length

  const metResolution = tickets.filter(t => t.sla_status_resolution === 'cumprido' || t.sla_status_resolution === 'no_prazo').length
  const breachedResolution = tickets.filter(t => t.sla_breach_resolution === true).length

  const avgCSAT = csatData && csatData.length > 0 
    ? csatData.reduce((acc, curr) => acc + curr.score, 0) / csatData.length 
    : 0

  // Group by priority for 1st response achievement
  const priorityStats = ['critical', 'high', 'medium', 'low'].map(p => {
    const pTickets = tickets.filter(t => t.internal_level === p || t.priority === p)
    const pMet = pTickets.filter(t => !t.sla_breach_first_response).length
    const pTotal = pTickets.length
    return {
      priority: p,
      met: pMet,
      total: pTotal,
      pct: pTotal > 0 ? (pMet / pTotal) * 100 : 100
    }
  })

  return NextResponse.json({
    summary: {
      total: totalTickets,
      resolved: resolvedTickets,
      first_response_met_pct: totalTickets > 0 ? (metFirstResponse / totalTickets) * 100 : 100,
      resolution_met_pct: totalTickets > 0 ? (metResolution / totalTickets) * 100 : 100,
      breached_total: breachedFirstResponse + breachedResolution,
      avg_csat: Number(avgCSAT.toFixed(2))
    },
    priority_breakdown: priorityStats,
    recent_breaches: tickets
      .filter(t => t.sla_breach_first_response || t.sla_breach_resolution)
      .slice(0, 10)
  })
}
