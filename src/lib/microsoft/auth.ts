import { encrypt, decrypt } from '@/lib/crypto/encryption'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const CLIENT_ID = process.env.NEXT_PUBLIC_MS_CLIENT_ID
const CLIENT_SECRET = process.env.MS_CLIENT_SECRET
const TENANT_ID = process.env.NEXT_PUBLIC_MS_TENANT_ID || 'common'
// URL for OAuth Callback (can be env var, using NEXT_PUBLIC_BASE_URL)
const REDIRECT_URI = process.env.NEXT_PUBLIC_BASE_URL ? `${process.env.NEXT_PUBLIC_BASE_URL}/api/auth/microsoft/callback` : 'http://localhost:3000/api/auth/microsoft/callback'

export function getAuthorizationUrl(userId: string) {
  if (!CLIENT_ID) throw new Error('MS_CLIENT_ID not configured')
  
  const scope = 'offline_access Calendars.Read'
  const state = encrypt(userId) // basic protection to ensure callback matches user

  const url = new URL(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/authorize`)
  url.searchParams.set('client_id', CLIENT_ID)
  url.searchParams.set('response_type', 'code')
  url.searchParams.set('redirect_uri', REDIRECT_URI)
  url.searchParams.set('response_mode', 'query')
  url.searchParams.set('scope', scope)
  url.searchParams.set('state', state)

  return url.toString()
}

export async function exchangeCodeForTokens(code: string) {
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('MS_CLIENT_ID or MS_CLIENT_SECRET not configured')

  const params = new URLSearchParams()
  params.append('client_id', CLIENT_ID)
  params.append('client_secret', CLIENT_SECRET)
  params.append('scope', 'offline_access Calendars.Read')
  params.append('code', code)
  params.append('redirect_uri', REDIRECT_URI)
  params.append('grant_type', 'authorization_code')

  const response = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
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
  if (!CLIENT_ID || !CLIENT_SECRET) throw new Error('MS_CLIENT_ID or MS_CLIENT_SECRET not configured')

  const params = new URLSearchParams()
  params.append('client_id', CLIENT_ID)
  params.append('client_secret', CLIENT_SECRET)
  params.append('refresh_token', refreshToken)
  params.append('grant_type', 'refresh_token')

  const response = await fetch(`https://login.microsoftonline.com/${TENANT_ID}/oauth2/v2.0/token`, {
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
  const supabase = getSupabaseAdminClient()
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
    const refreshToken = decrypt(integration.refresh_token)
    const tokens = await getAccessTokenFromRefreshToken(refreshToken)

    // Update refresh token if Microsoft sent a new one
    if (tokens.refreshToken !== refreshToken) {
      await supabase
        .from('user_integrations')
        .update({
          refresh_token: encrypt(tokens.refreshToken),
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
