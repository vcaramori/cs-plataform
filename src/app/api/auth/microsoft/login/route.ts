import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { getAuthorizationUrl } from '@/lib/microsoft/auth'

export async function GET() {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  try {
    const url = getAuthorizationUrl(auth.user.id)
    return NextResponse.redirect(url)
  } catch (error) {
    console.error('[Microsoft Auth] Login error:', error)
    return NextResponse.json({ error: 'Failed to generate authorization URL' }, { status: 500 })
  }
}
