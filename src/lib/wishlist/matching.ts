import { generateText } from '@/lib/llm/gateway'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { searchEmbeddings } from '@/lib/supabase/vector-search'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import type { CatalogMatch } from './types'

export interface SignalMatch {
  signal_id: string
  verbatim: string
  account_id: string
  account_name: string
  similarity: number
}

export interface ItemMatch {
  item_id: string
  title: string
  status: string
  kind: string
  demand_accounts: number
  similarity: number   // melhor similaridade entre os sinais que apontam para este item
  mentions: number     // quantos sinais semelhantes apontam para este item
}

export interface MatchResult {
  items: ItemMatch[]       // itens canônicos candidatos para linkar (cross-customer)
  siblings: SignalMatch[]  // sinais semelhantes ainda não itemizados
}

/**
 * Busca sinais semelhantes em TODA a base (cross-customer) e os organiza em:
 * - itens canônicos candidatos (quando o sinal semelhante já está linkado a um item)
 * - sinais "irmãos" ainda soltos (candidatos a virar/serem agrupados no mesmo item)
 */
export async function findSimilar(
  text: string,
  opts: { excludeSignalId?: string; limit?: number; threshold?: number } = {}
): Promise<MatchResult> {
  if (!text || text.trim().length < 8) return { items: [], siblings: [] }

  let results: { source_id: string; similarity: number }[]
  try {
    const raw = await searchEmbeddings(text, {
      sourceType: 'wishlist_signal',
      limit: opts.limit ?? 20,
      // 0.7: frases curtas de CS no mesmo domínio têm similaridade-base alta (~0.55–0.65
      // mesmo sem relação). 0.5 marcava tudo como "parecido". 0.7 só agrupa o que é de fato similar.
      threshold: opts.threshold ?? 0.7,
    })
    results = raw.map((r) => ({ source_id: r.source_id, similarity: r.similarity }))
  } catch (e) {
    console.error('[wishlist/matching] vector search failed:', e instanceof Error ? e.message : e)
    return { items: [], siblings: [] }
  }

  // melhor similaridade por sinal
  const bySignal = new Map<string, number>()
  for (const r of results) {
    if (opts.excludeSignalId && r.source_id === opts.excludeSignalId) continue
    const prev = bySignal.get(r.source_id) ?? 0
    if (r.similarity > prev) bySignal.set(r.source_id, r.similarity)
  }
  if (bySignal.size === 0) return { items: [], siblings: [] }

  const db = getSupabaseAdminClient() as any
  const { data: signals } = await db
    .from('wishlist_signals')
    .select('id, verbatim, account_id, item_id, accounts(name)')
    .in('id', Array.from(bySignal.keys()))

  const siblings: SignalMatch[] = []
  const itemAgg = new Map<string, { best: number; mentions: number }>()

  for (const s of signals ?? []) {
    const sim = bySignal.get(s.id) ?? 0
    if (s.item_id) {
      const agg = itemAgg.get(s.item_id) ?? { best: 0, mentions: 0 }
      agg.best = Math.max(agg.best, sim)
      agg.mentions += 1
      itemAgg.set(s.item_id, agg)
    } else {
      siblings.push({
        signal_id: s.id,
        verbatim: s.verbatim,
        account_id: s.account_id,
        account_name: s.accounts?.name ?? '—',
        similarity: sim,
      })
    }
  }

  let items: ItemMatch[] = []
  if (itemAgg.size > 0) {
    const { data: itemRows } = await db
      .from('wishlist_items')
      .select('id, title, status, kind, demand_accounts')
      .in('id', Array.from(itemAgg.keys()))
    items = (itemRows ?? []).map((it: any) => ({
      item_id: it.id,
      title: it.title,
      status: it.status,
      kind: it.kind,
      demand_accounts: it.demand_accounts ?? 0,
      similarity: itemAgg.get(it.id)?.best ?? 0,
      mentions: itemAgg.get(it.id)?.mentions ?? 0,
    }))
    items.sort((a, b) => b.similarity - a.similarity)
  }

  siblings.sort((a, b) => b.similarity - a.similarity)
  return { items, siblings: siblings.slice(0, 8) }
}

const CATALOG_SYSTEM = `Você é um especialista no produto de uma plataforma SaaS de S&OP/S&OE.
Dada a lista de funcionalidades existentes e um pedido de cliente, diga se o pedido JÁ É ATENDIDO por alguma funcionalidade existente.
Responda SOMENTE em JSON: {"feature_id":"<id ou null>","confidence":0.0,"rationale":"curto"}. Se nada se encaixa, feature_id=null.`

export interface CatalogFeature { id: string; name: string; description: string | null; module: string | null }

/** Carrega as features ativas do catálogo (até 200). */
export async function loadActiveFeatures(): Promise<CatalogFeature[]> {
  const db = getSupabaseAdminClient() as any
  const { data } = await db.from('product_features').select('id, name, description, module').eq('is_active', true).limit(200)
  return (data ?? []) as CatalogFeature[]
}

/**
 * Núcleo do match: dada uma lista de features (já pré-filtrada quando possível — ver otimização
 * por embedding no cron), decide se o pedido já é atendido. Prompt proporcional à lista recebida.
 */
export async function matchAgainstFeatures(text: string, features: CatalogFeature[]): Promise<CatalogMatch | null> {
  if (!text || text.trim().length < 8 || features.length === 0) return null
  const catalog = features
    .map((f) => `- [${f.id}] ${f.name}${f.module ? ` (${f.module})` : ''}: ${f.description ?? ''}`)
    .join('\n')
  try {
    const { result } = await generateText(
      `Funcionalidades existentes:\n${catalog}\n\nPedido do cliente:\n${text.slice(0, 1500)}`,
      { systemInstruction: await buildSystemInstruction('wishlist_catalog_match', CATALOG_SYSTEM), responseMimeType: 'application/json', temperature: 0, allowFallback: true }
    )
    let txt = result.trim()
    if (txt.startsWith('```')) txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(txt)
    if (!parsed || !parsed.feature_id) return null
    const feature = features.find((f) => f.id === parsed.feature_id)
    if (!feature) return null
    return {
      feature_id: feature.id,
      feature_name: feature.name,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.6,
      rationale: String(parsed.rationale ?? '').slice(0, 400),
    }
  } catch (e) {
    console.error('[wishlist/matching] catalog match failed:', e instanceof Error ? e.message : e)
    return null
  }
}

/**
 * Sugere uma funcionalidade existente do catálogo que atenda ao pedido — caminho "já existe".
 * Usado no clique "Analisar" da triagem (carrega todas as features). No cron, prefira o pré-filtro
 * por embedding + matchAgainstFeatures (top-K) para prompts menores.
 */
export async function suggestCatalogMatch(text: string): Promise<CatalogMatch | null> {
  if (!text || text.trim().length < 8) return null
  const features = await loadActiveFeatures()
  return matchAgainstFeatures(text, features)
}
