import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getUserRole } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { hasPermission, canManageUser } from '@/lib/auth/permissions'
import { resolveRoleAssignment } from '@/lib/auth/resolve-role'

async function requireAuth() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const role = await getUserRole(user.id)
  if (!role || !hasPermission(role, 'manage:users')) return null

  return { user, role }
}

export async function PUT(request: Request) {
  const auth = await requireAuth()
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient()
    const { updates } = await request.json()

    if (!Array.isArray(updates) || updates.length === 0) {
      return NextResponse.json({ error: 'Nenhuma alteracao fornecida' }, { status: 400 })
    }

    const errors: string[] = []
    const results: any[] = []

    for (const { id, role } of updates) {
      // Only super_admin can assign super_admin
      if (role === 'super_admin' && auth.role !== 'super_admin') {
        errors.push(`Sem permissao para atribuir super_admin ao usuario ${id}`)
        continue
      }

      // Check if caller can manage this target user
      const targetRole = await getUserRole(id)
      if (targetRole && !canManageUser(auth.role, targetRole)) {
        errors.push(`Sem permissao para gerenciar usuario ${id}`)
        continue
      }

      // Resolve perfil (role legado OU nome de custom_role) sem violar profiles_role_check
      const resolved = await resolveRoleAssignment(admin, role, targetRole)
      const { data, error } = await admin
        .from('profiles')
        .update({ role: resolved.role, custom_role_id: resolved.custom_role_id })
        .eq('id', id)
        .select()
        .single()

      if (error) {
        errors.push(`Erro ao atualizar ${id}: ${error.message}`)
      } else {
        results.push(data)
      }
    }

    if (errors.length > 0 && results.length === 0) {
      return NextResponse.json({ error: errors.join('; ') }, { status: 403 })
    }

    return NextResponse.json({ updated: results, errors })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
