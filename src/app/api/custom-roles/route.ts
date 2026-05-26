import { NextResponse } from 'next/server'
import { getSupabaseServerClient, getUserRole } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { hasPermission } from '@/lib/auth/permissions'

async function requireAuth(permission: 'view:users' | 'manage:roles') {
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
    const { data, error } = await admin
      .from('custom_roles')
      .select('*')
      .order('name', { ascending: true })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAuth('manage:roles')
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient()
    const { name, description, permissions } = await request.json()

    if (!name) {
      return NextResponse.json({ error: 'O nome do perfil e obrigatorio' }, { status: 400 })
    }

    const { data, error } = await admin
      .from('custom_roles')
      .insert([{ name, description, permissions: permissions || [] }])
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  const auth = await requireAuth('manage:roles')
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient()
    const { id, name, description, permissions } = await request.json()

    if (!id || !name) {
      return NextResponse.json({ error: 'ID e nome sao obrigatorios' }, { status: 400 })
    }

    const updates: Record<string, any> = { name, description, updated_at: new Date().toISOString() }
    if (permissions !== undefined) {
      updates.permissions = permissions
    }

    const { data, error } = await admin
      .from('custom_roles')
      .update(updates)
      .eq('id', id)
      .select()
      .single()

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json(data)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAuth('manage:roles')
  if (!auth) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient()
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')

    if (!id) {
      return NextResponse.json({ error: 'ID do perfil e obrigatorio' }, { status: 400 })
    }

    const { error } = await admin
      .from('custom_roles')
      .delete()
      .eq('id', id)

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
