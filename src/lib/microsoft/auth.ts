import { encrypt, decrypt } from '@/lib/crypto/encryption'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getMicrosoftConfig } from './config'

const SCOPE = 'offline_access Calendars.Read'

/**
 * Gera a URL de autorização da Microsoft. Credenciais vêm do banco (Configurações →
 * Calendário) e o redirect_uri é derivado do request — nada em env.
 */
export async function getAuthorizationUrl(userId: string, redirectUri: string) {
  const { client_id, client_secret, tenant_id } = await getMicrosoftConfig()
  if (!client_id) throw new Error('Client ID da Microsoft não configurado (Configurações → Calendário)')
  if (!client_secret) throw new Error('Client Secret da Microsoft não configurado (Configurações → Calendário)')

  const state = await encrypt(userId) // basic protection to ensure callback matches user

  const url = new URL(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/authorize`)
  url.searchParams.set('client_id', client_id)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', redirectUri)
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', SCOPE)
  url.searchParams.set('state', state)

  return url.toString()
}

export async function exchangeCodeForTokens(code: string, redirectUri: string) {
  const { client_id, client_secret, tenant_id } = await getMicrosoftConfig()
  if (!client_id || !client_secret) throw new Error('Credenciais Microsoft não configuradas (Configurações → Calendário)')

  const params = new URLSearchParams()
  params.append('client_id', client_id)
  params.append('client_secret', client_secret)
  params.append('scope', SCOPE)
  params.append('code', code)
  params.append('redirect_uri', redirectUri)
  params.append('grant_type', 'authorization_code')

  const response = await fetch(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to exchange code: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token,
    expiresIn: data.expires_in
  }
}

export async function getAccessTokenFromRefreshToken(refreshToken: string) {
  const { client_id, client_secret, tenant_id } = await getMicrosoftConfig()
  if (!client_id || !client_secret) throw new Error('Credenciais Microsoft não configuradas (Configurações → Calendário)')

  const params = new URLSearchParams()
  params.append('client_id', client_id)
  params.append('client_secret', client_secret)
  params.append('refresh_token', refreshToken)
  params.append('grant_type', 'refresh_token')

  const response = await fetch(`https://login.microsoftonline.com/${tenant_id}/oauth2/v2.0/token`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: params.toString()
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Failed to refresh token: ${error}`)
  }

  const data = await response.json()
  return {
    accessToken: data.access_token,
    refreshToken: data.refresh_token, // could be new
    expiresIn: data.expires_in
  }
}

export async function getUserAccessToken(userId: string): Promise<string | null> {
  // user_integrations ainda não consta nos tipos gerados do Supabase → cast (padrão do projeto)
  const supabase = getSupabaseAdminClient() as any
  const { data: integration, error } = await supabase
    .from('user_integrations')
    .select('*')
    .eq('user_id', userId)
    .eq('provider', 'microsoft_office365')
    .single()

  if (error || !integration || !integration.refresh_token) {
    return null
  }

  try {
    const refreshToken = await decrypt(integration.refresh_token)
    const tokens = await getAccessTokenFromRefreshToken(refreshToken)

    // Update refresh token if Microsoft sent a new one
    if (tokens.refreshToken !== refreshToken) {
      await supabase
        .from('user_integrations')
        .update({
          refresh_token: await encrypt(tokens.refreshToken),
          updated_at: new Date().toISOString()
        })
        .eq('id', integration.id)
    }

    return tokens.accessToken
  } catch (err) {
    console.error(`[Office365] Error refreshing token for ${userId}:`, err)
    return null
  }
}
