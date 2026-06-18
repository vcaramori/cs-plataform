import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { buildAuthorizeUrl, generatePkce, generateState, readaiRedirectUri } from '@/lib/integrations/readai/oauth'

export const dynamic = 'force-dynamic'

const COOKIE = 'readai_oauth_pkce'

/**
 * Inicia o OAuth do Read.ai: gera state + PKCE, guarda em cookie httpOnly curto e
 * redireciona o CSM para o login do Read.ai. O retorno cai em /callback.
 */
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const state = generateState()
  const { verifier, challenge } = generatePkce()
  const redirectUri = readaiRedirectUri(request)

  let authorizeUrl: string
  try {
    authorizeUrl = await buildAuthorizeUrl({ state, codeChallenge: challenge, redirectUri })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Falha ao iniciar OAuth'
    return NextResponse.redirect(new URL(`/home?readai=error&reason=${encodeURIComponent(msg)}`, redirectUri))
  }

  const res = NextResponse.redirect(authorizeUrl)
  // state|verifier — só precisa sobreviver ao round-trip (10 min basta).
  // path '/' (não restrito) p/ garantir envio no retorno cross-site (SameSite=Lax, top-level GET).
  res.cookies.set(COOKIE, `${state}.${verifier}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 600,
  })
  return res
}
