import { NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/microsoft/auth'
import { appBaseUrl, microsoftRedirectUri } from '@/lib/microsoft/config'
import { encrypt, decrypt } from '@/lib/crypto/encryption'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export async function GET(request: Request) {
  const url = new URL(request.url)
  const code = url.searchParams.get('code')
  const state = url.searchParams.get('state') // This is the encrypted userId

  if (!code || !state) {
    return NextResponse.json({ error: 'Missing code or state parameter' }, { status: 400 })
  }

  let userId: string
  try {
    userId = await decrypt(state)
  } catch (err) {
    console.error('[Microsoft Auth] Invalid state parameter:', err)
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
  }

  try {
    const tokens = await exchangeCodeForTokens(code, microsoftRedirectUri(request))
    const encryptedRefreshToken = await encrypt(tokens.refreshToken)

    // user_integrations ainda não consta nos tipos gerados do Supabase → cast (padrão do projeto)
    const supabase = getSupabaseAdminClient() as any

    // Upsert the integration
    const { error } = await supabase
      .from('user_integrations')
      .upsert({
        user_id: userId,
        provider: 'microsoft_office365',
        refresh_token: encryptedRefreshToken,
        updated_at: new Date().toISOString()
      }, {
        onConflict: 'user_id, provider'
      })

    if (error) {
      console.error('[Microsoft Auth] Supabase upsert error:', error)
      throw new Error('Database error saving integration')
    }

    // Redirect back to Home with a success parameter (base derivada do request — sem env)
    return NextResponse.redirect(`${appBaseUrl(request)}/home?ms_auth=success`)
  } catch (error) {
    console.error('[Microsoft Auth] Callback error:', error)
    const reason = error instanceof Error ? error.message : 'erro'
    return NextResponse.redirect(`${appBaseUrl(request)}/home?ms_auth=error&reason=${encodeURIComponent(reason)}`)
  }
}
