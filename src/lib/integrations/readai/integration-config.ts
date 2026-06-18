import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Configuração da integração Read.ai guardada no BANCO (app_settings.readai_integration).
 * Mesma filosofia do HelpDesk: nada de segredo hardcoded — o admin liga/desliga e (opcional)
 * informa credenciais de um app OAuth manual pela tela de Configurações.
 *
 * O Read.ai NÃO tem token estático: o acesso é OAuth 2.1 (Authorization Code + PKCE) com
 * dynamic client registration. Por padrão a plataforma se auto-registra (ver oauth.ts) e
 * guarda o client em app_settings.readai_oauth; este config só precisa de client_id/secret
 * quando o admin preferir um app OAuth criado manualmente.
 */

const KEY = 'readai_integration'

export interface ReadAiIntegrationConfig {
  enabled?: boolean
  /** Conta padrão (UUID) usada quando a resolução por participante/título não casar. */
  fallback_account_id?: string
  /** Se true, reuniões sem conta resolvida vão para fallback_account_id (default: pular). */
  store_unmatched?: boolean
  /** App OAuth criado manualmente (opcional). Vazio = usa dynamic client registration. */
  oauth_client_id?: string
  oauth_client_secret?: string
}

export async function getReadAiConfig(): Promise<ReadAiIntegrationConfig> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', KEY)
    .maybeSingle()
  return ((data?.value as ReadAiIntegrationConfig) ?? {}) as ReadAiIntegrationConfig
}

export async function saveReadAiConfig(
  patch: Partial<ReadAiIntegrationConfig>,
  userId?: string
): Promise<ReadAiIntegrationConfig> {
  const admin = getSupabaseAdminClient()
  const current = await getReadAiConfig()
  const merged = { ...current, ...patch }
  await admin.from('app_settings').upsert(
    {
      key: KEY,
      value: merged as unknown as never,
      description: 'Integração Read.ai: flag de ativação, conta padrão e (opcional) app OAuth manual',
      updated_by: userId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
  return merged
}
