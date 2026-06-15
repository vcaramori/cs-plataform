import { NextResponse } from 'next/server'
import { storeBearerToken, getBearerToken } from '@/lib/integrations/helpdesk/client'

export const dynamic = 'force-dynamic'

/**
 * Recebe e armazena o Bearer token do HelpDesk (renovado pelo refresher de login).
 * Protegido por API_SECRET (header x-api-secret).
 *
 * POST body: { access_token: string, expires_in?: number }
 */
export async function POST(request: Request) {
  if (request.headers.get('x-api-secret') !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  let body: { access_token?: string; expires_in?: number }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: 'JSON inválido' }, { status: 400 })
  }

  if (!body.access_token || typeof body.access_token !== 'string') {
    return NextResponse.json({ error: 'access_token ausente' }, { status: 400 })
  }

  await storeBearerToken(body.access_token, body.expires_in)
  return NextResponse.json({ success: true }, { status: 200 })
}

/** Status: indica se há token armazenado (sem expor o valor). */
export async function GET(request: Request) {
  if (request.headers.get('x-api-secret') !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const token = await getBearerToken()
  return NextResponse.json({ hasToken: !!token }, { status: 200 })
}
