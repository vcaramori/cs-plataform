import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  // Indicador de ÁREA: todos os clientes (global) para usuários internos.
  const { data: prof } = await supabase.from('profiles').select('user_type').eq('id', user.id).maybeSingle()
  if ((prof as any)?.user_type === 'external') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = getSupabaseAdminClient() as any

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
  const dateTo = searchParams.get('date_to') ?? new Date().toISOString()

  const { data: tickets, error } = await db
    .from('support_tickets')
    .select('id, account_id, status, internal_level, opened_at, resolved_at, sla_breach_resolution, resolution_deadline, accounts!inner(id, name, csm_owner_id)')
    .gte('opened_at', dateFrom)
    .lte('opened_at', dateTo)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const { data: csatData } = await db
    .from('csat_responses')
    .select('score, account_id')
    .gte('answered_at', dateFrom)
    .lte('answered_at', dateTo)

  // Group by account
  const accountMap = new Map<string, {
    name: string; total: number; critical: number;
    resTotal: number; resCount: number; resBreached: number; resWithSLA: number;
    csatScores: number[]
  }>()

  for (const t of tickets ?? []) {
    const accountName = (t.accounts as any)?.name ?? 'Desconhecido'
    if (!accountMap.has(t.account_id)) {
      accountMap.set(t.account_id, {
        name: accountName, total: 0, critical: 0,
        resTotal: 0, resCount: 0, resBreached: 0, resWithSLA: 0, csatScores: []
      })
    }
    const a = accountMap.get(t.account_id)!
    a.total++
    if (t.internal_level === 'critical') a.critical++
    if (t.resolved_at) {
      a.resTotal += new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()
      a.resCount++
    }
    if (t.resolution_deadline) {
      a.resWithSLA++
      if (t.sla_breach_resolution) a.resBreached++
    }
  }

  for (const c of csatData ?? []) {
    if (accountMap.has(c.account_id)) {
      accountMap.get(c.account_id)!.csatScores.push(c.score)
    }
  }

  const result = Array.from(accountMap.entries()).map(([accountId, a]) => ({
    account_id: accountId,
    account_name: a.name,
    tickets: a.total,
    critical_tickets: a.critical,
    res_compliance_pct: a.resWithSLA > 0 ? Math.round((1 - a.resBreached / a.resWithSLA) * 100) : null,
    avg_resolution_minutes: a.resCount > 0 ? Math.round(a.resTotal / a.resCount / 60000) : null,
    avg_csat: a.csatScores.length > 0
      ? Math.round(a.csatScores.reduce((s, v) => s + v, 0) / a.csatScores.length * 10) / 10 : null,
  }))

  return NextResponse.json({ clients: result })
}
