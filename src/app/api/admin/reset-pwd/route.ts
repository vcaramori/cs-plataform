import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const secret = url.searchParams.get('secret')

  if (secret !== 'temp-reset-2026') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const email = 'vinicius.caramori@plannera.com.br'
  const newPassword = 'Plannera@2026'

  try {
    const { data: usersData, error: listError } = await supabase.auth.admin.listUsers()
    
    if (listError) throw listError

    const user = usersData.users.find(u => u.email === email)
    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const { data, error } = await supabase.auth.admin.updateUserById(user.id, {
      password: newPassword,
      email_confirm: true
    })

    if (error) throw error

    return NextResponse.json({ success: true, email: data.user.email })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
