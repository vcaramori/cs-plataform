import { runVocEnrich } from '@/lib/voc/enrich'
import { runWishlistEnrich } from '@/lib/wishlist/enrich'
import { clusterVocThemes } from '@/lib/voc/cluster-themes'

/**
 * ORQUESTRADOR ÚNICO de enriquecimento (VoC + Wishlist + taxonomia) — passo 1 da consolidação
 * (ver docs/product/wishlist-plan-v2.md → "Decisão de arquitetura").
 *
 * Substitui os crons separados (voc-enrich / wishlist-enrich / voc-cluster-themes), que rodavam
 * concorrentes e somavam IO sem teto comum — exatamente o que estressou a instância (instabilidade).
 * Aqui tudo roda sob UM orçamento de tempo/IO, em estágios ISOLADOS (try/catch): a falha de um não
 * derruba os outros. Cada estágio recebe o tempo RESTANTE. Os passes internos continuam idempotentes
 * (gates `*_at`), então o que não couber num ciclo entra no próximo.
 *
 * (Passo 2 da consolidação — leitura única por documento — substituirá os estágios de extração por
 * um `enrichInteraction` único, sem regredir o VoC; ver plano.)
 */

export interface EnrichResult {
  voc: unknown | null
  wishlist: unknown | null
  taxonomy: unknown | null
  stages: Record<string, 'ok' | 'skipped' | 'error'>
  errors: string[]
  duration_ms: number
}

const RESERVE_MS = 8000 // margem para o estágio retornar antes do kill da Vercel (maxDuration)

export async function runEnrich(opts?: { budgetMs?: number }): Promise<EnrichResult> {
  const start = Date.now()
  const deadline = start + (opts?.budgetMs ?? 290000)
  const remaining = () => deadline - Date.now()
  const errors: string[] = []
  const stages: Record<string, 'ok' | 'skipped' | 'error'> = {}
  let voc: unknown = null
  let wishlist: unknown = null
  let taxonomy: unknown = null

  // 1) VoC — prioridade (sentimento/temas/citações alimentam o health score). Até ~150s.
  try {
    voc = await runVocEnrich({ budgetMs: Math.min(remaining() - RESERVE_MS, 150000) })
    stages.voc = 'ok'
  } catch (e) {
    stages.voc = 'error'
    errors.push('voc:' + (e instanceof Error ? e.message : 'erro'))
  }

  // 2) Wishlist — categoriza / pré-casa com catálogo / clusteriza. Até ~90s.
  if (remaining() > 25000) {
    try {
      wishlist = await runWishlistEnrich({ budgetMs: Math.min(remaining() - RESERVE_MS, 90000) })
      stages.wishlist = 'ok'
    } catch (e) {
      stages.wishlist = 'error'
      errors.push('wishlist:' + (e instanceof Error ? e.message : 'erro'))
    }
  } else {
    stages.wishlist = 'skipped'
  }

  // 3) Taxonomia de temas do VoC (incremental) — usa o tempo restante.
  if (remaining() > 20000) {
    try {
      taxonomy = await clusterVocThemes({ deadlineMs: remaining() - RESERVE_MS })
      stages.taxonomy = 'ok'
    } catch (e) {
      stages.taxonomy = 'error'
      errors.push('taxonomy:' + (e instanceof Error ? e.message : 'erro'))
    }
  } else {
    stages.taxonomy = 'skipped'
  }

  return { voc, wishlist, taxonomy, stages, errors, duration_ms: Date.now() - start }
}
