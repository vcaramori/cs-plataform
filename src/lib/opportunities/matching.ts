import { generateText } from '@/lib/llm/gateway'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { searchEmbeddings } from '@/lib/supabase/vector-search'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import type { PlanMatch } from './types'

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
  opportunity_type: string
  demand_accounts: number
  similarity: number
  mentions: number
}

export interface MatchResult {
  items: ItemMatch[]
  siblings: SignalMatch[]
}

/**
 * Dedup cross-customer: busca sinais de oportunidade semelhantes em toda a base e
 * organiza em itens canônicos candidatos + sinais "irmãos" ainda soltos.
 * Espelho de `src/lib/wishlist/matching.ts:findSimilar` para `opportunity_signal`.
 */
export async function findSimilar(
  text: string,
  opts: { excludeSignalId?: string; limit?: number; threshold?: number } = {}
): Promise<MatchResult> {
  if (!text || text.trim().length < 8) return { items: [], siblings: [] }

  let results: { source_id: string; similarity: number }[]
  try {
    const raw = await searchEmbeddings(text, {
      sourceType: 'opportunity_signal',
      limit: opts.limit ?? 20,
      // 0.7: evita marcar tudo como "parecido" (frases curtas no mesmo domínio têm base ~0.55–0.65).
      threshold: opts.threshold ?? 0.7,
    })
    results = raw.map((r) => ({ source_id: r.source_id, similarity: r.similarity }))
  } catch (e) {
    console.error('[opportunities/matching] vector search failed:', e instanceof Error ? e.message : e)
    return { items: [], siblings: [] }
  }

  const bySignal = new Map<string, number>()
  for (const r of results) {
    if (opts.excludeSignalId && r.source_id === opts.excludeSignalId) continue
    const prev = bySignal.get(r.source_id) ?? 0
    if (r.similarity > prev) bySignal.set(r.source_id, r.similarity)
  }
  if (bySignal.size === 0) return { items: [], siblings: [] }

  const db = getSupabaseAdminClient() as any
  const { data: signals } = await db
    .from('opportunity_signals')
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
      .from('opportunity_items')
      .select('id, title, status, opportunity_type, demand_accounts')
      .in('id', Array.from(itemAgg.keys()))
    items = (itemRows ?? []).map((it: any) => ({
      item_id: it.id,
      title: it.title,
      status: it.status,
      opportunity_type: it.opportunity_type,
      demand_accounts: it.demand_accounts ?? 0,
      similarity: itemAgg.get(it.id)?.best ?? 0,
      mentions: itemAgg.get(it.id)?.mentions ?? 0,
    }))
    items.sort((a, b) => b.similarity - a.similarity)
  }

  siblings.sort((a, b) => b.similarity - a.similarity)
  return { items, siblings: siblings.slice(0, 8) }
}

const PLAN_SYSTEM = `Você é um especialista comercial de uma plataforma SaaS de S&OP/S&OE.
Dada a lista de funcionalidades existentes (com os planos que as incluem) e uma necessidade do cliente,
diga se a necessidade JÁ É ATENDIDA por uma funcionalidade que existe em ALGUM plano (caminho de upsell: o
cliente só precisa subir de plano). Responda SOMENTE em JSON:
{"feature_id":"<id ou null>","confidence":0.0,"rationale":"curto"}. Se nada se encaixa, feature_id=null.`

/**
 * Sugere uma funcionalidade existente (em algum plano) que atenda à necessidade — base do
 * caminho "já temos / upsell de plano". Preenche matched_feature_id + matched_plan_id.
 */
export async function suggestPlanMatch(text: string): Promise<PlanMatch | null> {
  if (!text || text.trim().length < 8) return null
  const db = getSupabaseAdminClient() as any

  const { data: features } = await db
    .from('product_features')
    .select('id, name, description, module')
    .eq('is_active', true)
    .limit(200)
  if (!features || features.length === 0) return null

  // Mapa feature -> planos que a incluem (para indicar "no plano X")
  const { data: planFeatures } = await db
    .from('plan_features')
    .select('feature_id, plan_id, subscription_plans(name, tier_rank)')
  const plansByFeature = new Map<string, { plan_id: string; name: string; tier_rank: number }[]>()
  for (const pf of planFeatures ?? []) {
    if (!pf.subscription_plans) continue
    const arr = plansByFeature.get(pf.feature_id) ?? []
    arr.push({ plan_id: pf.plan_id, name: pf.subscription_plans.name, tier_rank: pf.subscription_plans.tier_rank ?? 0 })
    plansByFeature.set(pf.feature_id, arr)
  }

  const catalog = features
    .map((f: any) => {
      const plans = (plansByFeature.get(f.id) ?? []).map((p) => p.name).join(', ')
      return `- [${f.id}] ${f.name}${f.module ? ` (${f.module})` : ''}${plans ? ` — planos: ${plans}` : ''}: ${f.description ?? ''}`
    })
    .join('\n')

  try {
    const { result } = await generateText(
      `Funcionalidades existentes (com planos):\n${catalog}\n\nNecessidade do cliente:\n${text.slice(0, 1500)}`,
      { systemInstruction: await buildSystemInstruction('opportunity_plan_match', PLAN_SYSTEM), responseMimeType: 'application/json', temperature: 0, allowFallback: true }
    )
    let txt = result.trim()
    if (txt.startsWith('```')) txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
    const parsed = JSON.parse(txt)
    if (!parsed || !parsed.feature_id) return null
    const feature = features.find((f: any) => f.id === parsed.feature_id)
    if (!feature) return null
    // escolhe o plano de menor tier que inclui a feature (alvo de upsell)
    const plans = (plansByFeature.get(feature.id) ?? []).sort((a, b) => a.tier_rank - b.tier_rank)
    const plan = plans[0] ?? null
    return {
      feature_id: feature.id,
      feature_name: feature.name,
      plan_id: plan?.plan_id ?? null,
      plan_name: plan?.name ?? null,
      confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.6,
      rationale: String(parsed.rationale ?? '').slice(0, 400),
    }
  } catch (e) {
    console.error('[opportunities/matching] plan match failed:', e instanceof Error ? e.message : e)
    return null
  }
}
