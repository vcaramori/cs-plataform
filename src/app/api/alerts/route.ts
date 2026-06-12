import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { deriveTreatments } from '@/lib/alerts/treatment'

// GET /api/alerts — Central de Alertas consolidada.
// Escopo: global vê TODAS as contas (super_admin/head); own vê só as próprias.
// Usa admin client + escopo aplicado no app (a RLS de proactive_alerts é por dono,
// o que zeraria a visão de um super_admin que não possui contas).
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const url = new URL(request.url)
  const status = url.searchParams.get('status') || 'active' // active | resolved | all
  const severity = url.searchParams.get('severity')
  const type = url.searchParams.get('type')
  const limit = parseInt(url.searchParams.get('limit') || '200')

  const admin = getSupabaseAdminClient() as any

  // Escopo de contas visíveis
  const scope = await getUserAccessScope(user.id, 'accounts')
  let accQuery = admin.from('accounts').select('id, name, csm_owner_id')
  if (scope !== 'global') accQuery = accQuery.eq('csm_owner_id', user.id)
  const { data: visibleAccounts } = await accQuery
  const accMap = new Map<string, any>((visibleAccounts ?? []).map((a: any) => [a.id, a]))
  const visibleIds = Array.from(accMap.keys())
  if (visibleIds.length === 0) return NextResponse.json({ alerts: [], unread: 0, scope })

  // Alertas no escopo
  let q = admin.from('proactive_alerts').select('*').in('account_id', visibleIds)
  if (status === 'active') q = q.is('resolved_at', null)
  else if (status === 'resolved') q = q.not('resolved_at', 'is', null)
  if (severity) q = q.eq('severity', severity)
  if (type) q = q.eq('type', type)
  q = q.order('severity', { ascending: false }).order('created_at', { ascending: false }).limit(limit)
  const { data: alerts, error } = await q
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = alerts ?? []
  const alertIds = list.map((a: any) => a.id)

  // Tratamento derivado + leitura do usuário (em lote)
  const [treatments, readRows] = await Promise.all([
    deriveTreatments(admin, list),
    alertIds.length
      ? admin.from('alert_reads').select('alert_id').eq('user_id', user.id).in('alert_id', alertIds)
      : Promise.resolve({ data: [] }),
  ])
  const readSet = new Set<string>(((readRows as any).data ?? []).map((r: any) => r.alert_id))

  // Nomes dos donos (para a visão do super_admin)
  const ownerIds = Array.from(new Set((visibleAccounts ?? []).map((a: any) => a.csm_owner_id).filter(Boolean)))
  const ownerMap = new Map<string, string>()
  if (ownerIds.length > 0) {
    const { data: owners } = await admin.from('profiles').select('id, full_name').in('id', ownerIds)
    for (const o of owners ?? []) ownerMap.set(o.id, o.full_name)
  }

  const enriched = list.map((a: any) => {
    const acc = accMap.get(a.account_id)
    const t = treatments.get(a.id)
    return {
      ...a,
      account_name: acc?.name ?? '—',
      owner_id: acc?.csm_owner_id ?? null,
      owner_name: acc?.csm_owner_id ? (ownerMap.get(acc.csm_owner_id) ?? null) : null,
      treatment: t?.treatment ?? (a.resolved_at ? 'tratado' : 'pendente'),
      linked_entity: t?.entity ?? null,
      read: readSet.has(a.id),
    }
  })

  const unread = enriched.filter((a: any) => !a.read).length
  return NextResponse.json({ alerts: enriched, unread, scope })
}
