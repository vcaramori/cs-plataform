import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

// Série diária de chamados recebidos x resolvidos no período (indicador de ÁREA, global).
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { data: prof } = await supabase.from('profiles').select('user_type').eq('id', user.id).maybeSingle()
  if ((prof as any)?.user_type === 'external') return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  const db = getSupabaseAdminClient() as any

  const { searchParams } = new URL(request.url)
  const dateFrom = searchParams.get('date_from') ?? new Date(Date.now() - 30 * 86400000).toISOString()
  const dateTo = searchParams.get('date_to') ?? new Date().toISOString()

  const [openedRes, resolvedRes] = await Promise.all([
    db.from('support_tickets').select('opened_at').gte('opened_at', dateFrom).lte('opened_at', dateTo),
    db.from('support_tickets').select('resolved_at').gte('resolved_at', dateFrom).lte('resolved_at', dateTo),
  ])

  const day = (iso: string) => iso.slice(0, 10)
  const map = new Map<string, { received: number; resolved: number }>()
  const bump = (d: string, k: 'received' | 'resolved') => {
    const cur = map.get(d) ?? { received: 0, resolved: 0 }
    cur[k]++
    map.set(d, cur)
  }
  for (const t of (openedRes.data ?? []) as any[]) if (t.opened_at) bump(day(t.opened_at), 'received')
  for (const t of (resolvedRes.data ?? []) as any[]) if (t.resolved_at) bump(day(t.resolved_at), 'resolved')

  const series = Array.from(map.entries())
    .map(([date, v]) => ({ date, received: v.received, resolved: v.resolved }))
    .sort((a, b) => (a.date < b.date ? -1 : 1))

  return NextResponse.json({ series })
}
