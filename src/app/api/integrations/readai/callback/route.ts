import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { exchangeCode, readaiRedirectUri } from '@/lib/integrations/readai/oauth'
import { saveOAuthTokens } from '@/lib/integrations/readai/tokens'

export const dynamic = 'force-dynamic'

const COOKIE = 'readai_oauth_pkce'

/** Retorno do OAuth do Read.ai: valida state, troca o code por tokens e os salva. */
export async function GET(request: Request) {
  const url = new URL(request.url)
  const redirectUri = readaiRedirectUri(request)
  const home = (params: string) => NextResponse.redirect(new URL(`/home?${params}`, redirectUri))

  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const err = url.searchParams.get('error')
  if (err) return home(`readai=error&reason=${encodeURIComponent(url.searchParams.get('error_description') || err)}`)

  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state')
  if (!code || !state) return home('readai=error&reason=missing_code')

  // Valida state + recupera o code_verifier do cookie.
  const raw = request.headers.get('cookie') ?? ''
  const match = raw.split(/;\s*/).find((c) => c.startsWith(`${COOKIE}=`))
  const cookieVal = match ? decodeURIComponent(match.split('=').slice(1).join('=')) : ''
  const [cookieState, verifier] = cookieVal.split('.')
  if (!cookieState || !verifier || cookieState !== state) {
    return home('readai=error&reason=invalid_state')
  }

  try {
    const tokens = await exchangeCode({ code, codeVerifier: verifier, redirectUri })
    await saveOAuthTokens(user.id, tokens)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao concluir OAuth'
    return home(`readai=error&reason=${encodeURIComponent(msg)}`)
  }

  const res = home('readai=connected')
  res.cookies.set(COOKIE, '', { path: '/api/integrations/readai', maxAge: 0 })
  return res
}
