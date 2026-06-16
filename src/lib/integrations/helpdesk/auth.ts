import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { randomBytes } from 'crypto'

/**
 * Configuração da integração HelpDesk guardada no BANCO (app_settings.helpdesk_integration).
 * Isso substitui a dependência de uma env var invisível no Vercel: o segredo é gerado e
 * gerido pela tela de Configurações da plataforma.
 */

const KEY = 'helpdesk_integration'

export interface HelpDeskIntegrationConfig {
  secret?: string
  fallback_account_id?: string
  enabled?: boolean
  /** de-para código (do colchete no assunto) → account_id */
  code_map?: Record<string, string>
  /** de-para domínio do e-mail → account_id */
  domain_map?: Record<string, string>
}

export async function getIntegrationConfig(): Promise<HelpDeskIntegrationConfig> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', KEY)
    .maybeSingle()
  return ((data?.value as HelpDeskIntegrationConfig) ?? {}) as HelpDeskIntegrationConfig
}

export async function saveIntegrationConfig(
  patch: Partial<HelpDeskIntegrationConfig>,
  userId?: string
): Promise<HelpDeskIntegrationConfig> {
  const admin = getSupabaseAdminClient()
  const current = await getIntegrationConfig()
  const merged = { ...current, ...patch }
  await admin.from('app_settings').upsert(
    {
      key: KEY,
      value: merged as unknown as never,
      description: 'Integração HelpDesk: segredo de API, conta padrão e flag de ativação',
      updated_by: userId ?? null,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
  return merged
}

/** Gera um novo segredo forte (hex de 24 bytes). */
export function generateSecret(): string {
  return randomBytes(24).toString('hex')
}

/**
 * Valida uma requisição server-to-server para os endpoints do HelpDesk.
 * Aceita (em ordem):
 *  1. x-api-secret == segredo do banco (gerido pela tela de Configurações);
 *  2. x-api-secret == process.env.API_SECRET (compatibilidade);
 *  3. Authorization: Bearer <CRON_SECRET> (Vercel Cron).
 */
export async function verifyHelpDeskRequest(request: Request): Promise<boolean> {
  const x = request.headers.get('x-api-secret')
  if (x) {
    const cfg = await getIntegrationConfig()
    if (cfg.secret && x === cfg.secret) return true
    if (process.env.API_SECRET && x === process.env.API_SECRET) return true
  }
  const auth = request.headers.get('authorization')
  if (auth && process.env.CRON_SECRET && auth === `Bearer ${process.env.CRON_SECRET}`) return true
  return false
}
