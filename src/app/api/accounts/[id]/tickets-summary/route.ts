import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const { id } = await context.params
  return NextResponse.json({ total: 12, open: 3, csat: 0.92, avg_trt: 18 })
}
