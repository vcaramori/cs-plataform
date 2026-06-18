import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getReadAiConfig, saveReadAiConfig } from '@/lib/integrations/readai/integration-config'
import { listConnectedUserIds } from '@/lib/integrations/readai/tokens'
import { runReadAiSync } from '@/lib/integrations/readai/sync'
import { appBaseUrl } from '@/lib/integrations/readai/oauth'

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

/** Status (nunca devolve segredos de OAuth nem as signing keys cruas). */
export async function GET(request: Request) {
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
      oauth_audience: cfg.oauth_audience ?? '',
      oauth_metadata_url: cfg.oauth_metadata_url ?? '',
      api_base_url: cfg.api_base_url ?? '',
    },
    registered: !!oauth.registered_client?.client_id,
    metadata_discovered: !!oauth.metadata,
    connected_users: connectedUsers,
    sync_state: stateRow?.value ?? null,
    webhook: {
      url: `${appBaseUrl(request)}/api/integrations/readai/webhook`,
      signing_keys_count: (cfg.webhook_signing_keys ?? []).filter(Boolean).length,
      default_csm_id: cfg.webhook_default_csm_id ?? '',
    },
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
      if (typeof body.oauth_audience === 'string') patch.oauth_audience = body.oauth_audience.trim()
      if (typeof body.oauth_metadata_url === 'string') patch.oauth_metadata_url = body.oauth_metadata_url.trim()
      if (typeof body.api_base_url === 'string') patch.api_base_url = body.api_base_url.trim()
      await saveReadAiConfig(patch, user.id)
      return NextResponse.json({ success: true })
    }

    if (action === 'save_webhook') {
      const patch: Record<string, unknown> = {}
      // signing_keys: aceita string única (linhas/vírgulas) ou array; vazio = limpa.
      if (body.webhook_signing_keys !== undefined) {
        const raw = body.webhook_signing_keys
        const keys = (Array.isArray(raw) ? raw : String(raw).split(/[\n,]+/))
          .map((k: string) => k.trim())
          .filter(Boolean)
        patch.webhook_signing_keys = keys
      }
      if (typeof body.webhook_default_csm_id === 'string') {
        patch.webhook_default_csm_id = body.webhook_default_csm_id.trim()
      }
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
