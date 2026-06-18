import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { createHash, randomBytes } from 'crypto'
import { getReadAiConfig } from './integration-config'

/**
 * OAuth 2.1 do Read.ai (Authorization Code + PKCE + offline refresh).
 *
 * Fatos confirmados nos docs oficiais (jun/2026):
 *  - NÃO há token estático/pessoal hoje (planejado p/ GA). Só OAuth 2.1.
 *  - Dynamic client registration: POST https://api.read.ai/oauth/register
 *  - Scopes: openid email profile offline_access meeting:read mcp:execute
 *  - Audiences: https://api.read.ai/v1/meetings e https://api.read.ai/mcp
 *  - Access token expira em ~10min; refresh token é single-use e ROTACIONA a cada uso.
 *
 * Os endpoints authorize/token são descobertos em runtime (.well-known) e cacheados em
 * app_settings.readai_oauth — endpoint exato não pôde ser confirmado offline; por isso
 * descoberta defensiva com fallbacks e logs. O client OAuth é auto-registrado (dynamic
 * client registration) ou informado manualmente pelo admin (readai_integration).
 */

const OAUTH_KEY = 'readai_oauth'
const DEFAULT_REGISTRATION_ENDPOINT = 'https://api.read.ai/oauth/register'
export const READAI_SCOPES = 'openid email profile offline_access meeting:read mcp:execute'

const DISCOVERY_URLS = [
  process.env.READAI_OAUTH_METADATA_URL,
  'https://api.read.ai/.well-known/oauth-authorization-server',
  'https://api.read.ai/.well-known/openid-configuration',
  'https://api.read.ai/oauth/.well-known/oauth-authorization-server',
].filter((u): u is string => !!u)

// Defaults best-guess (sobrescritos pela descoberta quando disponível).
const FALLBACK_METADATA: OAuthMetadata = {
  authorization_endpoint: 'https://api.read.ai/oauth/authorize',
  token_endpoint: 'https://api.read.ai/oauth/token',
  registration_endpoint: DEFAULT_REGISTRATION_ENDPOINT,
}

export interface OAuthMetadata {
  issuer?: string
  authorization_endpoint: string
  token_endpoint: string
  registration_endpoint?: string
}

export interface RegisteredClient {
  client_id: string
  client_secret?: string
  token_endpoint_auth_method?: string
}

interface OAuthStore {
  metadata?: OAuthMetadata
  registered_client?: RegisteredClient
}

export interface OAuthTokens {
  access_token: string
  refresh_token?: string
  expires_in?: number
}

// ---------------------------------------------------------------------------
// Persistência do store OAuth (metadata + client registrado) em app_settings.
// ---------------------------------------------------------------------------
async function readStore(): Promise<OAuthStore> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin.from('app_settings').select('value').eq('key', OAUTH_KEY).maybeSingle()
  return ((data?.value as OAuthStore) ?? {}) as OAuthStore
}
async function writeStore(patch: Partial<OAuthStore>): Promise<void> {
  const admin = getSupabaseAdminClient()
  const current = await readStore()
  const merged = { ...current, ...patch }
  await admin.from('app_settings').upsert(
    { key: OAUTH_KEY, value: merged as unknown as never, description: 'Read.ai OAuth: metadata descoberto + client registrado', updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
}

// ---------------------------------------------------------------------------
// Descoberta de metadata (com cache).
// ---------------------------------------------------------------------------
export async function getOAuthMetadata(force = false): Promise<OAuthMetadata> {
  if (!force) {
    const store = await readStore()
    if (store.metadata?.authorization_endpoint && store.metadata?.token_endpoint) return store.metadata
  }
  for (const url of DISCOVERY_URLS) {
    try {
      const res = await fetch(url, { headers: { Accept: 'application/json' }, cache: 'no-store' })
      if (!res.ok) continue
      const j = (await res.json()) as Partial<OAuthMetadata>
      if (j.authorization_endpoint && j.token_endpoint) {
        const metadata: OAuthMetadata = {
          issuer: j.issuer,
          authorization_endpoint: j.authorization_endpoint,
          token_endpoint: j.token_endpoint,
          registration_endpoint: j.registration_endpoint ?? DEFAULT_REGISTRATION_ENDPOINT,
        }
        await writeStore({ metadata })
        return metadata
      }
    } catch {
      // tenta o próximo candidato
    }
  }
  console.warn('[Read.ai OAuth] Descoberta de metadata falhou; usando defaults best-guess. Confirme os endpoints contra uma chamada real.')
  return FALLBACK_METADATA
}

// ---------------------------------------------------------------------------
// Cliente OAuth: manual (admin) → registrado em cache → dynamic registration.
// ---------------------------------------------------------------------------
export async function getRegisteredClient(redirectUri: string): Promise<RegisteredClient> {
  const cfg = await getReadAiConfig()
  if (cfg.oauth_client_id) {
    return { client_id: cfg.oauth_client_id, client_secret: cfg.oauth_client_secret, token_endpoint_auth_method: cfg.oauth_client_secret ? 'client_secret_post' : 'none' }
  }
  const store = await readStore()
  if (store.registered_client?.client_id) {
    // Se o redirect mudou (ex.: domínio), re-registra.
    return store.registered_client
  }
  return registerClient(redirectUri)
}

async function registerClient(redirectUri: string): Promise<RegisteredClient> {
  const meta = await getOAuthMetadata()
  const endpoint = meta.registration_endpoint ?? DEFAULT_REGISTRATION_ENDPOINT
  const res = await fetch(endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
    cache: 'no-store',
    body: JSON.stringify({
      client_name: 'CS-Continuum (Plannera)',
      redirect_uris: [redirectUri],
      grant_types: ['authorization_code', 'refresh_token'],
      response_types: ['code'],
      scope: READAI_SCOPES,
      token_endpoint_auth_method: 'client_secret_post',
    }),
  })
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Read.ai dynamic client registration falhou (HTTP ${res.status}): ${body.slice(0, 300)}`)
  }
  const j = (await res.json()) as { client_id: string; client_secret?: string; token_endpoint_auth_method?: string }
  const client: RegisteredClient = {
    client_id: j.client_id,
    client_secret: j.client_secret,
    token_endpoint_auth_method: j.token_endpoint_auth_method ?? (j.client_secret ? 'client_secret_post' : 'none'),
  }
  await writeStore({ registered_client: client })
  return client
}

// ---------------------------------------------------------------------------
// PKCE + URL de autorização.
// ---------------------------------------------------------------------------
const b64url = (buf: Buffer) => buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')

export function generatePkce(): { verifier: string; challenge: string } {
  const verifier = b64url(randomBytes(48)) // 64 chars base64url
  const challenge = b64url(createHash('sha256').update(verifier).digest())
  return { verifier, challenge }
}
export function generateState(): string {
  return b64url(randomBytes(24))
}

/** Base pública do app (deve bater com o redirect_uri registrado). */
export function appBaseUrl(req?: Request): string {
  const env = process.env.NEXT_PUBLIC_APP_URL
  if (env) return env.replace(/\/$/, '')
  if (req) {
    try { return new URL(req.url).origin } catch { /* ignore */ }
  }
  return 'http://localhost:3000'
}
export function readaiRedirectUri(req?: Request): string {
  return `${appBaseUrl(req)}/api/integrations/readai/callback`
}

export async function buildAuthorizeUrl(opts: { state: string; codeChallenge: string; redirectUri: string }): Promise<string> {
  const meta = await getOAuthMetadata()
  const client = await getRegisteredClient(opts.redirectUri)
  const url = new URL(meta.authorization_endpoint)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('client_id', client.client_id)
  url.searchParams.set('redirect_uri', opts.redirectUri)
  url.searchParams.set('scope', READAI_SCOPES)
  url.searchParams.set('state', opts.state)
  url.searchParams.set('code_challenge', opts.codeChallenge)
  url.searchParams.set('code_challenge_method', 'S256')
  return url.toString()
}

// ---------------------------------------------------------------------------
// Troca de code / refresh.
// ---------------------------------------------------------------------------
async function tokenRequest(params: Record<string, string>, redirectUri: string): Promise<OAuthTokens> {
  const meta = await getOAuthMetadata()
  const client = await getRegisteredClient(redirectUri)
  const body = new URLSearchParams({ ...params, client_id: client.client_id })
  if (client.client_secret) body.set('client_secret', client.client_secret)
  const res = await fetch(meta.token_endpoint, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded', Accept: 'application/json' },
    cache: 'no-store',
    body: body.toString(),
  })
  if (!res.ok) {
    const text = await res.text().catch(() => '')
    throw new Error(`Read.ai token endpoint HTTP ${res.status}: ${text.slice(0, 300)}`)
  }
  const j = (await res.json()) as OAuthTokens
  if (!j.access_token) throw new Error('Read.ai token endpoint não retornou access_token')
  return j
}

export async function exchangeCode(opts: { code: string; codeVerifier: string; redirectUri: string }): Promise<OAuthTokens> {
  return tokenRequest(
    { grant_type: 'authorization_code', code: opts.code, redirect_uri: opts.redirectUri, code_verifier: opts.codeVerifier },
    opts.redirectUri
  )
}

/** Refresh: o refresh token ROTACIONA — sempre persistir o novo retornado. */
export async function refreshAccessToken(refreshToken: string): Promise<OAuthTokens> {
  const redirectUri = readaiRedirectUri()
  return tokenRequest({ grant_type: 'refresh_token', refresh_token: refreshToken }, redirectUri)
}
