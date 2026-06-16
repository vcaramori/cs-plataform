import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getIntegrationConfig, saveIntegrationConfig, generateSecret } from '@/lib/integrations/helpdesk/auth'
import { storeBearerToken, getBearerToken } from '@/lib/integrations/helpdesk/client'
import { runHelpDeskSync } from '@/lib/integrations/helpdesk/sync'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

async function requireAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) return null
  return user
}

/** Status (nunca devolve o segredo nem o token em si). */
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient()
  const cfg = await getIntegrationConfig()

  const { data: tokenRow } = await admin
    .from('app_settings').select('value').eq('key', 'helpdesk_token').maybeSingle()
  const tokenVal = (tokenRow?.value ?? {}) as { access_token?: string; refreshed_at?: string; expires_in?: number }

  const { data: stateRow } = await admin
    .from('app_settings').select('value').eq('key', 'helpdesk_sync_state').maybeSingle()

  return NextResponse.json({
    config: {
      enabled: cfg.enabled ?? false,
      fallback_account_id: cfg.fallback_account_id ?? '',
      has_secret: !!cfg.secret,
    },
    token: {
      present: !!tokenVal.access_token && tokenVal.access_token.length > 20,
      refreshed_at: tokenVal.refreshed_at ?? null,
      expires_in_days: tokenVal.expires_in ? Math.round((tokenVal.expires_in / 86400) * 10) / 10 : null,
    },
    sync_state: stateRow?.value ?? null,
  })
}

/**
 * Ações:
 *  - { action: 'rotate_secret' } → gera novo segredo e o devolve UMA vez (copie!).
 *  - { action: 'save_config', enabled?, fallback_account_id? }
 *  - { action: 'set_token', access_token, expires_in? }
 *  - { action: 'run_sync' } → dispara a sincronização agora.
 */
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const action = body.action as string

  try {
    if (action === 'rotate_secret') {
      const secret = generateSecret()
      await saveIntegrationConfig({ secret }, user.id)
      return NextResponse.json({ success: true, secret })
    }

    if (action === 'save_config') {
      const patch: { enabled?: boolean; fallback_account_id?: string } = {}
      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
      if (typeof body.fallback_account_id === 'string') patch.fallback_account_id = body.fallback_account_id.trim()
      await saveIntegrationConfig(patch, user.id)
      return NextResponse.json({ success: true })
    }

    if (action === 'set_token') {
      const token = String(body.access_token ?? '').trim()
      if (token.length < 20) return NextResponse.json({ error: 'Token inválido' }, { status: 400 })
      await storeBearerToken(token, typeof body.expires_in === 'number' ? body.expires_in : undefined)
      const ok = !!(await getBearerToken())
      return NextResponse.json({ success: ok })
    }

    if (action === 'run_sync') {
      const result = await runHelpDeskSync()
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
