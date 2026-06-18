import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { encrypt, decrypt } from '@/lib/crypto/encryption'
import { refreshAccessToken, type OAuthTokens } from './oauth'

/**
 * Credenciais OAuth do Read.ai por CSM, guardadas CRIPTOGRAFADAS em user_integrations
 * (provider='readai'). O CSM conecta uma vez (login no navegador) e o sistema renova o
 * access token (≈10min) em background usando o refresh token.
 *
 * Read.ai usa refresh tokens SINGLE-USE que rotacionam a cada refresh → ao renovar,
 * persistimos imediatamente o novo par {access, refresh}.
 */

const PROVIDER = 'readai'
// Margem de segurança: renova se faltam ≤60s para expirar.
const EXPIRY_SKEW_MS = 60_000

/** Salva (criptografado) o par de tokens OAuth de um usuário. */
export async function saveOAuthTokens(userId: string, tokens: OAuthTokens): Promise<void> {
  const admin = getSupabaseAdminClient()
  const expiresAt = tokens.expires_in
    ? new Date(Date.now() + tokens.expires_in * 1000).toISOString()
    : null
  const row: Record<string, unknown> = {
    user_id: userId,
    provider: PROVIDER,
    access_token: encrypt(tokens.access_token),
    updated_at: new Date().toISOString(),
  }
  // refresh token rotaciona — só sobrescreve quando o provedor mandou um novo.
  if (tokens.refresh_token) row.refresh_token = encrypt(tokens.refresh_token)
  if (expiresAt) row.token_expires_at = expiresAt
  await (admin as any).from('user_integrations').upsert(row, { onConflict: 'user_id,provider' })
}

export async function deleteToken(userId: string): Promise<void> {
  const admin = getSupabaseAdminClient()
  await (admin as any).from('user_integrations').delete().eq('user_id', userId).eq('provider', PROVIDER)
}

/** Indica se o usuário tem Read.ai conectado (sem expor o token). */
export async function hasToken(userId: string): Promise<boolean> {
  const admin = getSupabaseAdminClient()
  const { data } = await (admin as any)
    .from('user_integrations')
    .select('refresh_token')
    .eq('user_id', userId)
    .eq('provider', PROVIDER)
    .maybeSingle()
  return !!data?.refresh_token
}

/** IDs dos usuários com Read.ai conectado (para o job de sync). */
export async function listConnectedUserIds(): Promise<string[]> {
  const admin = getSupabaseAdminClient()
  const { data } = await (admin as any)
    .from('user_integrations')
    .select('user_id, refresh_token')
    .eq('provider', PROVIDER)
  return ((data ?? []) as Array<{ user_id: string; refresh_token: string | null }>)
    .filter((r) => !!r.refresh_token)
    .map((r) => r.user_id)
}

interface StoredTokens { access_token: string | null; refresh_token: string | null; token_expires_at: string | null }

/**
 * Devolve um access token VÁLIDO do usuário, renovando de forma transparente quando
 * necessário (e persistindo o novo refresh rotacionado). Retorna null se não houver
 * conexão ou se o refresh falhar (CSM precisa reconectar).
 */
export async function getValidAccessToken(userId: string): Promise<string | null> {
  const admin = getSupabaseAdminClient()
  const { data } = await (admin as any)
    .from('user_integrations')
    .select('access_token, refresh_token, token_expires_at')
    .eq('user_id', userId)
    .eq('provider', PROVIDER)
    .maybeSingle()
  const row = (data ?? null) as StoredTokens | null
  if (!row?.refresh_token) return null

  const expiresAt = row.token_expires_at ? new Date(row.token_expires_at).getTime() : 0
  const stillValid = row.access_token && expiresAt - Date.now() > EXPIRY_SKEW_MS
  if (stillValid) {
    try { return decrypt(row.access_token!) } catch { /* cai no refresh */ }
  }

  // Renova usando o refresh token (rotaciona — persistir o novo imediatamente).
  let refresh: string
  try { refresh = decrypt(row.refresh_token) } catch { return null }
  try {
    const tokens = await refreshAccessToken(refresh)
    await saveOAuthTokens(userId, tokens)
    return tokens.access_token
  } catch (e) {
    console.error(`[Read.ai] refresh falhou para ${userId}:`, e instanceof Error ? e.message : e)
    return null
  }
}
