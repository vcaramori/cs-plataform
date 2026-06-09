import { NextResponse } from 'next/server'
import { reembedMissing } from '@/lib/rag/reembed'

export const maxDuration = 300

// Aceita dois modos de auth:
//  - Vercel Cron (agendado em vercel.json): envia `Authorization: Bearer <CRON_SECRET>`
//    quando a env CRON_SECRET existe.
//  - Agendador externo / acionamento manual: header `x-api-secret` == API_SECRET.
function isAuthorized(request: Request): boolean {
  const apiSecret = process.env.API_SECRET
  const cronSecret = process.env.CRON_SECRET
  const xApiSecret = request.headers.get('x-api-secret')
  const authHeader = request.headers.get('authorization')

  if (apiSecret && xApiSecret === apiSecret) return true
  if (cronSecret && authHeader === `Bearer ${cronSecret}`) return true
  return false
}

// Cron: reprocessa embeddings faltantes em lote (catch-up automático após
// falhas/sem-créditos).
export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const stats = await reembedMissing({ limitPerType: 200 })
  return NextResponse.json({ ok: true, stats })
}

// Permite acionar via GET também (alguns agendadores usam GET).
export async function GET(request: Request) {
  return POST(request)
}
