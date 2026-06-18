import { NextResponse } from 'next/server'
import { runReadAiSync } from '@/lib/integrations/readai/sync'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'

export const maxDuration = 300
export const dynamic = 'force-dynamic'

/**
 * Job: sincroniza reuniões do Read.ai de TODOS os agentes conectados.
 * Auth: mesmo segredo dos crons (verifyHelpDeskRequest = segredo do banco / API_SECRET / CRON_SECRET).
 */
async function handle(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runReadAiSync()
    return NextResponse.json({ success: true, ...result }, { status: 200 })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[Read.ai Sync] Falha:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
