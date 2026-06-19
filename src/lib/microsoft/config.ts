import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Configuração da integração Microsoft 365 (calendário) guardada no BANCO
 * (app_settings.microsoft_integration) — nada em env, conforme a premissa do projeto.
 * O admin informa as credenciais do app Azure AD (client_id/secret/tenant) pela tela
 * Configurações → Calendário (Microsoft). Env é só fallback de migração.
 */

const KEY = 'microsoft_integration'

export interface MicrosoftConfig {
  client_id?: string
  client_secret?: string
  /** 'common' (multi-tenant), 'organizations' ou o GUID/domínio do tenant. Default: 'common'. */
  tenant_id?: string
}

export interface ResolvedMicrosoftConfig {
  client_id: string
  client_secret: string
  tenant_id: string
}

/** Config resolvida (banco → fallback env → defaults). */
export async function getMicrosoftConfig(): Promise<ResolvedMicrosoftConfig> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin.from('app_settings').select('value').eq('key', KEY).maybeSingle()
  const cfg = ((data?.value as MicrosoftConfig) ?? {}) as MicrosoftConfig
  return {
    client_id: (cfg.client_id || process.env.NEXT_PUBLIC_MS_CLIENT_ID || '').trim(),
    client_secret: (cfg.client_secret || process.env.MS_CLIENT_SECRET || '').trim(),
    tenant_id: (cfg.tenant_id || process.env.NEXT_PUBLIC_MS_TENANT_ID || 'common').trim(),
  }
}

export async function saveMicrosoftConfig(
  patch: Partial<MicrosoftConfig>,
  userId?: string
): Promise<void> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin.from('app_settings').select('value').eq('key', KEY).maybeSingle()
  const current = ((data?.value as MicrosoftConfig) ?? {}) as MicrosoftConfig
  const merged = { ...current, ...patch }
  await admin.from('app_settings').upsert(
    {
      key: KEY,
      value: merged as unknown as never,
      description: 'Integração Microsoft 365 (calendário): credenciais do app Azure AD',
      updated_by: userId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
}

/** Base pública do app (mesma lógica do Read.ai). NEXT_PUBLIC_APP_URL é infra de plataforma. */
export function appBaseUrl(req?: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL
  if (env) return env.replace(/\/$/, '')
  if (req) {
    try { return new URL(req.url).origin } catch { /* ignore */ }
  }
  return 'http://localhost:3000'
}

/** redirect_uri do OAuth Microsoft — deve bater com o registrado no app Azure AD. */
export function microsoftRedirectUri(req?: Request): string {
  return `${appBaseUrl(req)}/api/auth/microsoft/callback`
}
