import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { runDueSteps, handleSlaTimeouts } from '@/lib/workflows/triggers'

export const maxDuration = 300

/**
 * Avança as execuções: processa steps prontos (pending + next_run_at vencido)
 * e trata timeouts de SLA de tarefas humanas/aprovações. Rode a cada ~1 min.
 */
export async function POST(request: Request) {
  if (request.headers.get('x-api-secret') !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const admin = getSupabaseAdminClient()
  try {
    const timeouts = await handleSlaTimeouts(admin)
    const steps = await runDueSteps(admin)
    return NextResponse.json({ ok: true, steps, timeouts })
  } catch (e: any) {
    console.error('[workflow-executor]', e)
    return NextResponse.json({ error: e?.message ?? String(e) }, { status: 500 })
  }
}
