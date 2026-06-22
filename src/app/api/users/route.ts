import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getUserRole } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { hasPermission, canManageUser } from '@/lib/auth/permissions'
import { resolveRoleAssignment } from '@/lib/auth/resolve-role'
import type { UserRole } from '@/lib/supabase/types'

async function requireAuth(permission: 'view:users' | 'manage:users') {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const admin = getSupabaseAdminClient() as any
  const { data: prof } = await admin
    .from('profiles')
    .select('role, is_super_admin')
    .eq('id', user.id)
    .single()
  const role = (prof?.role ?? null) as UserRole | null
  // Acesso Total (flag) é o override; mantém compat com role legado super_admin
  const isSuperAdmin = !!prof?.is_super_admin || role === 'super_admin'

  // Acesso Total ignora a checagem de permissão por role
  if (!isSuperAdmin && (!role || !hasPermission(role, permission))) return null

  return { user, role, isSuperAdmin }
}

export async function GET() {
  const auth = await requireAuth('view:users')
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient()
    const { data: { users }, error } = await admin.auth.admin.listUsers()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const { data: profiles } = await admin.from('profiles').select('*')

    // Mapa custom_role_id → nome (o "perfil" exibido/selecionável é o nome do custom role)
    const { data: customRoles } = await (admin as any).from('custom_roles').select('id, name')
    const roleNameById = new Map<string, string>((customRoles ?? []).map((r: any) => [r.id, r.name]))

    const formattedUsers = users.map(u => {
      const profile = profiles?.find(p => p.id === u.id)
      const customRoleId = (profile as any)?.custom_role_id ?? null
      // Usuário com custom role → exibe o NOME do perfil (casa com as opções do seletor);
      // senão, o role legado (ex.: super_admin).
      const effectiveRole = customRoleId && roleNameById.has(customRoleId)
        ? roleNameById.get(customRoleId)!
        : (profile?.role || 'csm')
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: profile?.full_name || 'N/A',
        role: effectiveRole,
        is_active: profile?.is_active !== false,
        user_type: (profile as any)?.user_type || 'internal',
        is_super_admin: !!(profile as any)?.is_super_admin || profile?.role === 'super_admin',
        avatar_url: (profile as any)?.avatar_url || null,
        default_onboarding_effort: !!(profile as any)?.default_onboarding_effort,
      }
    })

    return NextResponse.json(formattedUsers)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth('manage:users')
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient()
    const body = await request.json()
    const { email, password, full_name, role, avatar_url, is_super_admin } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha sao obrigatorios' }, { status: 400 })
    }

    // Apenas quem tem Acesso Total pode conceder Acesso Total
    if (is_super_admin === true && !auth.isSuperAdmin) {
      return NextResponse.json({ error: 'Apenas usuários com Acesso Total podem conceder Acesso Total' }, { status: 403 })
    }

    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split('@')[0] },
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const userId = data.user.id

    const resolved = await resolveRoleAssignment(admin, role, null)
    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name: full_name || email.split('@')[0],
        role: resolved.role,
        custom_role_id: resolved.custom_role_id,
        is_active: true,
        user_type: 'internal',
        avatar_url: avatar_url || null,
        is_super_admin: is_super_admin === true && auth.isSuperAdmin,
      } as any)
      .eq('id', userId)

    if (profileError) {
      console.error('Erro ao atualizar perfil do usuario criado:', profileError.message)
    }

    return NextResponse.json({
      id: userId,
      email: data.user.email,
      full_name: full_name || email.split('@')[0],
      role: role || 'CSM',
      is_active: true,
      user_type: 'internal',
      avatar_url: avatar_url || null,
      is_super_admin: is_super_admin === true && auth.isSuperAdmin,
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth('manage:users')
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient()
    const body = await request.json()
    const { id, role, is_active, full_name, avatar_url, is_super_admin, default_onboarding_effort } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do usuario e obrigatorio' }, { status: 400 })
    }

    // Check if caller can manage this user
    const targetRole = await getUserRole(id)
    if (targetRole && !canManageUser(auth.role, targetRole, auth.isSuperAdmin)) {
      return NextResponse.json({ error: 'Sem permissao para gerenciar este usuario' }, { status: 403 })
    }

    // Apenas quem tem Acesso Total pode conceder/revogar Acesso Total
    if (is_super_admin !== undefined && !auth.isSuperAdmin) {
      return NextResponse.json({ error: 'Apenas usuários com Acesso Total podem alterar Acesso Total' }, { status: 403 })
    }

    const updateData: Record<string, any> = {}
    if (role !== undefined) {
      const resolved = await resolveRoleAssignment(admin, role, targetRole)
      updateData.role = resolved.role
      updateData.custom_role_id = resolved.custom_role_id
    }
    if (is_active !== undefined) updateData.is_active = is_active
    if (full_name !== undefined) updateData.full_name = full_name
    if (avatar_url !== undefined) updateData.avatar_url = avatar_url
    if (is_super_admin !== undefined) {
      updateData.is_super_admin = is_super_admin
      // Revogar Acesso Total de super_admin legado: rebaixa o role base para que
      // o compat (OR role='super_admin') não reative o override após desligar a flag.
      if (is_super_admin === false && targetRole === 'super_admin' && updateData.role === undefined) {
        updateData.role = 'csm'
      }
    }
    if (default_onboarding_effort !== undefined) updateData.default_onboarding_effort = default_onboarding_effort

    const { data, error } = await admin
      .from('profiles')
      .update(updateData)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({
      id: data.id,
      full_name: data.full_name,
      role: data.role,
      is_active: data.is_active,
      is_super_admin: (data as any).is_super_admin ?? false,
      default_onboarding_effort: (data as any).default_onboarding_effort ?? false,
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
