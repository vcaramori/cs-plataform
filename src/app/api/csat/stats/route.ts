import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from')
  const dateTo = searchParams.get('date_to')
  const accountId = searchParams.get('account_id')
  const agentId = searchParams.get('agent_id')

  let query = supabase
    .from('csat_responses')
    .select('score, answered_at, account_id, agent_id')

  if (dateFrom) query = query.gte('answered_at', dateFrom)
  if (dateTo) query = query.lte('answered_at', dateTo)
  if (accountId) query = query.eq('account_id', accountId)
  if (agentId) query = query.eq('agent_id', agentId)

  const { data: responses, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const answered = responses ?? []

  // Total tickets in period to calculate response rate
  let ticketQuery = supabase
    .from('support_tickets')
    .select('id', { count: 'exact', head: true })
    .eq('status', 'resolved')
  if (dateFrom) ticketQuery = ticketQuery.gte('resolved_at', dateFrom)
  if (dateTo) ticketQuery = ticketQuery.lte('resolved_at', dateTo)
  const { count: totalResolved } = await ticketQuery

  const totalAnswered = answered.length
  const totalWithoutResponse = (totalResolved ?? 0) - totalAnswered
  const avgScore = totalAnswered > 0
    ? answered.reduce((sum, r) => sum + r.score, 0) / totalAnswered
    : null

  const distribution = [1, 2, 3, 4, 5].map(score => ({
    score,
    count: answered.filter(r => r.score === score).length
  }))

  return NextResponse.json({
    avg_score: avgScore ? Math.round(avgScore * 10) / 10 : null,
    total_answered: totalAnswered,
    total_without_response: totalWithoutResponse,
    distribution
  })
}
