import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const severity = url.searchParams.get('severity')
  const resolved = url.searchParams.get('resolved') === 'true'
  const limit = parseInt(url.searchParams.get('limit') || '50')

  // Escopo dinâmico: global vê alertas de todas as contas; own só das próprias
  const scope = await getUserAccessScope(user.id, 'accounts')
  let accountsScopeQuery = supabase.from('accounts').select('id')
  if (scope !== 'global') accountsScopeQuery = accountsScopeQuery.eq('csm_owner_id', user.id)
  const { data: accountIds } = await accountsScopeQuery

  const ids = accountIds?.map(a => a.id) || []

  if (ids.length === 0) {
    return NextResponse.json([])
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let query: any = supabase
    .from('proactive_alerts')
    .select('*')
    .in('account_id', ids)

  if (severity) query = query.eq('severity', severity)
  if (!resolved) query = query.is('resolved_at', null)

  query = query
    .order('severity', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(limit)

  const { data, error } = await query

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
