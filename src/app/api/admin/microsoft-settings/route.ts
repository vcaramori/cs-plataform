import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getMicrosoftConfig, saveMicrosoftConfig, microsoftRedirectUri } from '@/lib/microsoft/config'

export const dynamic = 'force-dynamic'

async function requireAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) return null
  return user
}

/** Status (NUNCA devolve o client_secret — só indica se está preenchido). */
export async function GET(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const cfg = await getMicrosoftConfig()
  // quantos CSMs já conectaram o calendário
  const admin = getSupabaseAdminClient() as any
  const { count } = await admin
    .from('user_integrations')
    .select('user_id', { count: 'exact', head: true })
    .eq('provider', 'microsoft_office365')

  return NextResponse.json({
    config: {
      client_id: cfg.client_id,
      tenant_id: cfg.tenant_id,
      has_client_secret: !!cfg.client_secret,
    },
    redirect_uri: microsoftRedirectUri(request),
    connected_users: count ?? 0,
  })
}

/** Salva a config do app Azure AD. { action: 'save_config', client_id?, client_secret?, tenant_id? } */
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  if (body.action !== 'save_config') {
    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  }

  try {
    const patch: Record<string, unknown> = {}
    if (typeof body.client_id === 'string') patch.client_id = body.client_id.trim()
    if (typeof body.tenant_id === 'string') patch.tenant_id = body.tenant_id.trim()
    // client_secret só sobrescreve quando vier preenchido (campo em branco = mantém o atual)
    if (typeof body.client_secret === 'string' && body.client_secret.trim().length > 0) {
      patch.client_secret = body.client_secret.trim()
    }
    await saveMicrosoftConfig(patch, user.id)
    return NextResponse.json({ success: true })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
