import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { exchangeCode, readaiRedirectUri } from '@/lib/integrations/readai/oauth'
import { saveOAuthTokens } from '@/lib/integrations/readai/tokens'

export const dynamic = 'force-dynamic'

const COOKIE = 'readai_oauth_pkce'
const DEBUG_KEY = 'readai_oauth_debug'

/**
 * Grava o resultado do callback OAuth em app_settings.readai_oauth_debug — para diagnóstico
 * (sem expor tokens). Best-effort: nunca quebra o fluxo.
 */
async function recordDebug(step: string, detail: Record<string, unknown>): Promise<void> {
  try {
    const admin = getSupabaseAdminClient()
    await admin.from('app_settings').upsert(
      {
        key: DEBUG_KEY,
        value: { at: new Date().toISOString(), step, ...detail } as unknown as never,
        description: 'Read.ai OAuth: último resultado do callback (diagnóstico, sem tokens)',
        updated_at: new Date().toISOString(),
      },
      { onConflict: 'key' }
    )
  } catch {
    /* diagnóstico é best-effort */
  }
}

/** Retorno do OAuth do Read.ai: valida state, troca o code por tokens e os salva. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const redirectUri = readaiRedirectUri(request)
  const home = (params: string) => NextResponse.redirect(new URL(`/home?${params}`, redirectUri))

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const err = url.searchParams.get('error')
  if (err) {
    const reason = url.searchParams.get('error_description') || err
    await recordDebug('authorize_error', { reason, redirectUri })
    return home(`readai=error&reason=${encodeURIComponent(reason)}`)
  }

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) {
    await recordDebug('missing_params', { hasCode: !!code, hasState: !!state, redirectUri })
    return home('readai=error&reason=missing_code')
  }

  // Valida state + recupera o code_verifier do cookie.
  const raw = request.headers.get('cookie') ?? ''
  const match = raw.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))
  const cookieVal = match ? decodeURIComponent(match.split('=').slice(1).join('=')) : ''
  const [cookieState, verifier] = cookieVal.split('.')
  if (!cookieState || !verifier || cookieState !== state) {
    await recordDebug('invalid_state', {
      redirectUri,
      cookiePresent: !!match,
      cookieHasState: !!cookieState,
      cookieHasVerifier: !!verifier,
      stateMatches: cookieState === state,
    })
    return home('readai=error&reason=invalid_state')
  }

  try {
    const tokens = await exchangeCode({ code, codeVerifier: verifier, redirectUri })
    await saveOAuthTokens(user.id, tokens)
    await recordDebug('success', {
      redirectUri,
      hasAccessToken: !!tokens.access_token,
      hasRefreshToken: !!tokens.refresh_token,
      expiresIn: tokens.expires_in ?? null,
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao concluir OAuth'
    await recordDebug('token_exchange_failed', { redirectUri, reason: msg })
    return home(`readai=error&reason=${encodeURIComponent(msg)}`)
  }

  const res = home('readai=connected')
  res.cookies.set(COOKIE, '', { path: '/', maxAge: 0 })
  return res
}
