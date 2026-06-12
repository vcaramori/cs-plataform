import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { generateAlertsForAccounts } from '@/lib/alerts/generate'

export const maxDuration = 300

// POST /api/alerts/evaluate — "Avaliar agora": gera/atualiza o catálogo de alertas
// para as contas visíveis ao usuário (mesma lógica da cron). Idempotente.
export async function POST() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient() as any
  const scope = await getUserAccessScope(user.id, 'accounts')

  let accQuery = admin.from('accounts').select('id, health_score_v2, csm_owner_id')
  if (scope !== 'global') accQuery = accQuery.eq('csm_owner_id', user.id)
  const { data: accounts, error } = await accQuery
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result = await generateAlertsForAccounts(admin, accounts ?? [])
  return NextResponse.json({ ok: true, ...result })
}
