import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'
import { runVocEnrich } from '@/lib/voc/enrich'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cron de enriquecimento da Voz do Cliente (Fase 2). Em LOTES PEQUENOS e idempotente:
 * - sentimento + keywords do comentário de NPS
 * - keywords do comentário de CSAT
 * - temas de dor/encanto das interações (transcrição/resumo)
 *
 * Orçamento de tempo ~180s (devolve limpo antes do kill de 300s). Auth: segredo dos crons.
 * Backfill é incremental — roda um pouco por execução, sem estourar o Disk IO.
 */
async function handle(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runVocEnrich({ budgetMs: 180000 })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[voc-enrich] Falha:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
