import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'
import { runEnrich } from '@/lib/enrich/orchestrator'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cron ÚNICO de enriquecimento (VoC + Wishlist + taxonomia) sob um orçamento de IO, estágios
 * isolados. Consolida e aposenta voc-enrich / wishlist-enrich / voc-cluster-themes (ver
 * docs/product/wishlist-plan-v2.md). Auth: segredo dos crons.
 */
async function handle(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await runEnrich({ budgetMs: 285000 })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[enrich] Falha:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
