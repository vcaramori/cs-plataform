import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getUserRole } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { hasPermission, canManageUser } from '@/lib/auth/permissions'
import type { UserRole } from '@/lib/supabase/types'

async function requireAuth(permission: 'view:users' | 'manage:users') {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const role = await getUserRole(user.id)
  if (!role || !hasPermission(role, permission)) return null

  return { user, role }
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

    const formattedUsers = users.map(u => {
      const profile = profiles?.find(p => p.id === u.id)
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: profile?.full_name || 'N/A',
        role: profile?.role || 'CSM',
        is_active: profile?.is_active !== false,
        user_type: (profile as any)?.user_type || 'internal',
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
    const { email, password, full_name, role, avatar_url } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha sao obrigatorios' }, { status: 400 })
    }

    // Only super_admin can assign super_admin role
    if (role === 'super_admin' && auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Apenas super_admin pode atribuir este perfil' }, { status: 403 })
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

    const { error: profileError } = await admin
      .from('profiles')
      .update({
        full_name: full_name || email.split('@')[0],
        role: role || 'CSM',
        is_active: true,
        user_type: 'internal',
        avatar_url: avatar_url || null,
      })
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
    const { id, role, is_active, full_name } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do usuario e obrigatorio' }, { status: 400 })
    }

    // Check if caller can manage this user
    const targetRole = await getUserRole(id)
    if (targetRole && !canManageUser(auth.role, targetRole)) {
      return NextResponse.json({ error: 'Sem permissao para gerenciar este usuario' }, { status: 403 })
    }

    // Only super_admin can assign super_admin role
    if (role === 'super_admin' && auth.role !== 'super_admin') {
      return NextResponse.json({ error: 'Apenas super_admin pode atribuir este perfil' }, { status: 403 })
    }

    const updateData: Record<string, any> = {}
    if (role !== undefined) updateData.role = role
    if (is_active !== undefined) updateData.is_active = is_active
    if (full_name !== undefined) updateData.full_name = full_name

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
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
