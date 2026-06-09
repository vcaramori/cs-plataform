import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { parsePermissions } from '@/lib/auth/permission-schema'

/**
 * GET /api/onboarding/owners — usuários elegíveis a RESPONSÁVEL de onboarding:
 * quem tem permissão de onboarding (edit/create) no perfil, super admin, ou
 * role legado admin/super_admin. Realiza o pedido "criar uma permissão p/ isso":
 * o módulo 'onboarding' na matriz de perfis define quem pode ser responsável.
 */
export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient() as any
  const { data: profiles } = await admin
    .from('profiles')
    .select('id, full_name, role, is_super_admin, custom_role_id, user_type')
    .order('full_name')

  const internal = (profiles ?? []).filter((p: any) => (p.user_type ?? 'internal') !== 'external')
  const roleIds = [...new Set(internal.map((p: any) => p.custom_role_id).filter(Boolean))]
  const permsByRole: Record<string, any[]> = {}
  if (roleIds.length) {
    const { data: roles } = await admin.from('custom_roles').select('id, permissions').in('id', roleIds)
    for (const r of roles ?? []) permsByRole[r.id] = parsePermissions(r.permissions) ?? []
  }

  const eligible = internal.filter((p: any) => {
    if (p.is_super_admin || p.role === 'super_admin' || p.role === 'admin') return true
    if (p.custom_role_id) {
      const ob = (permsByRole[p.custom_role_id] ?? []).find((m: any) => m.module === 'onboarding')
      return !!(ob && (ob.edit === true || ob.create === true))
    }
    return false
  }).map((p: any) => ({ id: p.id, full_name: p.full_name }))

  return NextResponse.json(eligible)
}
