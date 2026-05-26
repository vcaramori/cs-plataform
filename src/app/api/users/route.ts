import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

function getSupabaseAdmin() {
  const supabaseUrl = process.env.SUPABASE_URL
  const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !supabaseServiceKey) {
    throw new Error('Configurações de ambiente do Supabase ausentes')
  }

  return createClient(supabaseUrl, supabaseServiceKey, {
    auth: { autoRefreshToken: false, persistSession: false }
  })
}

export async function GET() {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const { data: { users }, error } = await supabaseAdmin.auth.admin.listUsers()
    
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch profiles to get name, role and is_active status
    const { data: profiles } = await supabaseAdmin
      .from('profiles')
      .select('*')

    // Format the users to return necessary info including profile data
    const formattedUsers = users.map(u => {
      const profile = profiles?.find(p => p.id === u.id)
      return {
        id: u.id,
        email: u.email,
        created_at: u.created_at,
        last_sign_in_at: u.last_sign_in_at,
        full_name: profile?.full_name || 'N/A',
        role: profile?.role || 'CSM',
        is_active: profile?.is_active !== false // Default to true if not specified
      }
    })

    return NextResponse.json(formattedUsers)
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { email, password, full_name, role } = body

    if (!email || !password) {
      return NextResponse.json({ error: 'Email e senha são obrigatórios' }, { status: 400 })
    }

    const { data, error } = await supabaseAdmin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { full_name: full_name || email.split('@')[0] }
    })

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const userId = data.user.id

    // Update profile with role, full_name and default to active
    const { error: profileError } = await supabaseAdmin
      .from('profiles')
      .update({
        full_name: full_name || email.split('@')[0],
        role: role || 'CSM',
        is_active: true
      })
      .eq('id', userId)

    if (profileError) {
      console.error('Erro ao atualizar perfil do usuário criado:', profileError.message)
    }

    return NextResponse.json({
      id: userId,
      email: data.user.email,
      full_name: full_name || email.split('@')[0],
      role: role || 'CSM',
      is_active: true
    }, { status: 201 })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}

export async function PUT(request: Request) {
  try {
    const supabaseAdmin = getSupabaseAdmin()
    const body = await request.json()
    const { id, role, is_active, full_name } = body

    if (!id) {
      return NextResponse.json({ error: 'ID do usuário é obrigatório' }, { status: 400 })
    }

    const updateData: any = {}
    if (role !== undefined) updateData.role = role
    if (is_active !== undefined) updateData.is_active = is_active
    if (full_name !== undefined) updateData.full_name = full_name

    const { data, error } = await supabaseAdmin
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
      is_active: data.is_active
    })
  } catch (e: any) {
    return NextResponse.json({ error: e.message }, { status: 500 })
  }
}
