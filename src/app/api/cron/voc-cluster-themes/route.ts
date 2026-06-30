import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'
import { clusterVocThemes } from '@/lib/voc/cluster-themes'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Cron de consolidação de temas de VoC por TAXONOMIA CANÔNICA via IA. Mapeia os labels livres de
 * `interaction_themes` para uma lista fechada de temas (editável em app_settings.voc_theme_taxonomy)
 * e popula `voc_theme_synonyms` (sinônimo→canônico), consolidando as "Top Dores/Elogios". IO-safe
 * (chamadas de IA fora do banco; só lê labels e escreve sinônimos). Incremental por padrão;
 * `?rebuild=1` limpa e remapeia tudo (usar após mudar a taxonomia). Roda semanalmente.
 */
async function handle(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  try {
    const rebuild = new URL(request.url).searchParams.get('rebuild') === '1'
    const result = await clusterVocThemes({ deadlineMs: 260000, rebuild })
    return NextResponse.json({ success: true, ...result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    console.error('[voc-cluster-themes] Falha:', message)
    return NextResponse.json({ success: false, error: message }, { status: 500 })
  }
}

export const GET = handle
export const POST = handle
