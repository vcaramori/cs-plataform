import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const { id } = await context.params
  const data = [
    { type: 'preparation', hours: 120 },
    { type: 'strategy', hours: 85 },
    { type: 'meetings', hours: 160 },
    { type: 'reporting', hours: 65 },
  ]
  return NextResponse.json({ data })
}
