import { NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'

export async function GET(request: Request, context: { params: Promise<{ id: string }> }) {
  const auth = await requireApiAuth()
  if (isAuthError(auth)) return auth

  const { id } = await context.params
  const responses = [
    { score: 9, comment: 'Otimo suporte!', created_at: new Date().toISOString() },
    { score: 8, comment: 'Produto atende bem', created_at: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString() },
  ]
  return NextResponse.json({ responses })
}
