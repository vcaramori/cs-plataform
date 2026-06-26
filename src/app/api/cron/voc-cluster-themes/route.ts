import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'
import { clusterVocThemes } from '@/lib/voc/cluster-themes'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cron de clustering de temas de VoC por IA. Agrupa os labels livres de `interaction_themes`
 * por similaridade de embedding e popula `voc_theme_synonyms` (sinônimo→canônico), consolidando
 * as "Top Dores/Elogios". IO-safe (embeddings em memória; só lê labels e escreve sinônimos).
 * Auth: segredo dos crons. Recomenda-se rodar semanalmente (novos temas se acumulam).
 */
async function handle(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const result = await clusterVocThemes({ deadlineMs: 260000 })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[voc-cluster-themes] Falha:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
