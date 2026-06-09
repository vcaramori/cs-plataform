import { NextResponse } from 'next/server'
import { reembedMissing } from '@/lib/rag/reembed'

export const maxDuration = 300

// Cron: reprocessa embeddings faltantes em lote (catch-up automático após
// falhas/sem-créditos). Auth via header x-api-secret (API_SECRET).
export async function POST(request: Request) {
  const secret = request.headers.get('x-api-secret')
  if (!process.env.API_SECRET || secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const stats = await reembedMissing({ limitPerType: 200 })
  return NextResponse.json({ ok: true, stats })
}

// Permite acionar via GET também (alguns agendadores usam GET).
export async function GET(request: Request) {
  return POST(request)
}
