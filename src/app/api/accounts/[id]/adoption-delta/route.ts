import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const { id } = await context.params
  return NextResponse.json({
    current: 65,
    previous: 70,
    delta: -7.14,
    trend: 'down',
  })
}
