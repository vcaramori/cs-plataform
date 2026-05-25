import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

async function requireAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient()
  const { data, error } = await (admin as any)
    .from('app_settings')
    .select('key, value')
    .eq('key', 'support_email_integration')
    .single()

  if (error && error.code !== 'PGRST116') { // PGRST116 means no row found, which is fine
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({
    settings: data?.value || {}
  })
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { settings } = body as { settings: Record<string, unknown> }

  if (!settings) {
    return NextResponse.json({ error: 'Settings object is required' }, { status: 400 })
  }

  const admin = getSupabaseAdminClient()
  const db = admin as any

  const { error } = await db
    .from('app_settings')
    .upsert({
      key: 'support_email_integration',
      value: settings,
      description: 'Credenciais e parâmetros da integração de e-mail de suporte (IMAP, SMTP, cron e overrides)',
      updated_by: user.id,
      updated_at: new Date().toISOString()
    }, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
