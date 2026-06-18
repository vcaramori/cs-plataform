import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getReadAiConfig, saveReadAiConfig } from '@/lib/integrations/readai/integration-config'
import { listConnectedUserIds } from '@/lib/integrations/readai/tokens'
import { runReadAiSync } from '@/lib/integrations/readai/sync'

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

/** Status (nunca devolve segredos de OAuth). */
export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient()
  const cfg = await getReadAiConfig()
  const { data: oauthRow } = await admin.from('app_settings').select('value').eq('key', 'readai_oauth').maybeSingle()
  const oauth = (oauthRow?.value ?? {}) as { registered_client?: { client_id?: string }; metadata?: unknown }
  const { data: stateRow } = await admin.from('app_settings').select('value').eq('key', 'readai_sync_state').maybeSingle()
  const connectedUsers = (await listConnectedUserIds()).length

  return NextResponse.json({
    config: {
      enabled: cfg.enabled ?? false,
      fallback_account_id: cfg.fallback_account_id ?? '',
      store_unmatched: cfg.store_unmatched ?? false,
      has_oauth_client: !!cfg.oauth_client_id,
    },
    registered: !!oauth.registered_client?.client_id,
    metadata_discovered: !!oauth.metadata,
    connected_users: connectedUsers,
    sync_state: stateRow?.value ?? null,
  })
}

/**
 * Ações:
 *  - { action: 'save_config', enabled?, fallback_account_id?, store_unmatched?, oauth_client_id?, oauth_client_secret? }
 *  - { action: 'run_sync' } → dispara a sincronização de todos os CSMs conectados.
 */
export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const action = body.action as string

  try {
    if (action === 'save_config') {
      const patch: Record<string, unknown> = {}
      if (typeof body.enabled === 'boolean') patch.enabled = body.enabled
      if (typeof body.fallback_account_id === 'string') patch.fallback_account_id = body.fallback_account_id.trim()
      if (typeof body.store_unmatched === 'boolean') patch.store_unmatched = body.store_unmatched
      if (typeof body.oauth_client_id === 'string') patch.oauth_client_id = body.oauth_client_id.trim()
      if (typeof body.oauth_client_secret === 'string') patch.oauth_client_secret = body.oauth_client_secret.trim()
      await saveReadAiConfig(patch, user.id)
      return NextResponse.json({ success: true })
    }

    if (action === 'run_sync') {
      const result = await runReadAiSync()
      return NextResponse.json({ success: true, result })
    }

    return NextResponse.json({ error: 'Ação inválida' }, { status: 400 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
