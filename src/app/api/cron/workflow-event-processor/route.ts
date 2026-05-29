import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { processEventQueue, processScheduled } from '@/lib/workflows/triggers'

export const maxDuration = 300

/**
 * Instancia execuções de Fluxos: consome a fila de eventos (com dedup) e
 * avalia gatilhos agendados vencidos. Rode a cada ~5 min.
 */
export async function POST(request: Request) {
  if (request.headers.get('x-api-secret') !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = getSupabaseAdminClient()
  try {
    const events = await processEventQueue(admin)
    const scheduled = await processScheduled(admin)
    return NextResponse.json({ ok: true, events, scheduled })
  } catch (e: any) {
    console.error('[workflow-event-processor]', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
