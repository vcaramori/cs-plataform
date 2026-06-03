import { NextResponse } from 'next/server'
import { exchangeCodeForTokens } from '@/lib/microsoft/auth'
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
    userId = decrypt(state)
  } catch (err) {
    console.error('[Microsoft Auth] Invalid state parameter:', err)
    return NextResponse.json({ error: 'Invalid state parameter' }, { status: 400 })
  }

  try {
    const tokens = await exchangeCodeForTokens(code)
    const encryptedRefreshToken = encrypt(tokens.refreshToken)

    const supabase = getSupabaseAdminClient()

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

    // Redirect back to Home with a success parameter
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/home?ms_auth=success`)
  } catch (error) {
    console.error('[Microsoft Auth] Callback error:', error)
    const baseUrl = process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'
    return NextResponse.redirect(`${baseUrl}/home?ms_auth=error`)
  }
}
