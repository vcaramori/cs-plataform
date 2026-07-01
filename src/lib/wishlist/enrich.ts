import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateText, generateEmbedding } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import { safeParseLLMJson } from '@/lib/llm/safe-json'
import { loadActiveFeatures, matchAgainstFeatures, type CatalogFeature } from './matching'
import { recomputeItemRice } from './rice'

/**
 * Enriquecimento ASSÍNCRONO da Wishlist (rodado SÓ pelo cron `wishlist-enrich`) — Fase 1 do v2.
 *
 * Destrava o funil: os sinais `pending` chegam categorizados (área), pré-casados com o catálogo
 * e agrupados em clusters, para a triagem ser feita em LOTE (aprovar um cluster, não 569 cliques).
 *
 * IO-SAFE (lição do incidente de Disk-IO): lotes pequenos, concorrência baixa, idempotente
 * (gates `area`/`catalog_match`/`enriched_at`/`cluster_key`) e com ORÇAMENTO DE TEMPO. Nunca rodar
 * dentro de request de usuário. As chamadas de IA vão ao provedor (não tocam o disco do Postgres).
 */

const CONCURRENCY = 3
const LLM_TIMEOUT_MS = 15000
const CAT_BATCH = 30 // sinais por chamada de categorização
const SIM_THRESHOLD = 0.8 // cosseno — acima disso, "mesmo pedido" (cluster)
const MAX_CLUSTER = 1500 // teto de sinais por execução de clustering

const DEFAULT_AREAS = [
  'indicadores e kpis', 'estoque e ruptura', 'custo, cogs e fluxo de caixa',
  'integração e importação de dados', 'planejamento de demanda e previsão',
  'planejamento de compras e fornecedores', 'bom e estrutura de produto',
  'rateio e alocação', 'relatórios e visualização', 'interface e usabilidade',
  'cadastro e dados mestres', 'colaboração e processo s&op', 'performance e processamento', 'outros',
]

const AREA_FALLBACK =
  'Você categoriza pedidos de produto (wishlist) de uma plataforma SaaS de S&OP/S&OE em UMA área canônica ' +
  'da lista fornecida no input. Responda SEMPRE em PT-BR e SOMENTE com JSON válido. Use exclusivamente as ' +
  'áreas da lista; se nenhuma servir, use "outros". Saída: {"itens":[{"id":<id>,"area":<área>}]}'

function normArea(s: string): string {
  return s.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}

async function loadAreas(admin: any): Promise<string[]> {
  try {
    const { data } = await admin.from('app_settings').select('value').eq('key', 'wishlist_area_taxonomy').maybeSingle()
    const areas = (data?.value as any)?.areas
    if (Array.isArray(areas) && areas.length) {
      const list = [...new Set(areas.map((a: unknown) => String(a).trim().toLowerCase()).filter(Boolean))]
      if (!list.includes('outros')) list.push('outros')
      return list
    }
  } catch { /* usa default */ }
  return DEFAULT_AREAS
}

function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  const d = Math.sqrt(na) * Math.sqrt(nb)
  return d ? dot / d : 0
}

async function runBatched<T>(items: T[], fn: (item: T) => Promise<void>, deadline: number): Promise<number> {
  let done = 0
  for (let i = 0; i < items.length; i += CONCURRENCY) {
    if (Date.now() > deadline) break
    const batch = items.slice(i, i + CONCURRENCY)
    await Promise.all(batch.map(async (it) => { await fn(it); done++ }))
  }
  return done
}

/** A) Categoriza sinais pendentes em áreas canônicas (em LOTE, barato). */
export async function categorizeSignals(limit: number, deadline: number): Promise<number> {
  const admin = getSupabaseAdminClient() as any
  const areas = await loadAreas(admin)
  const areaSet = new Set(areas)
  const { data } = await admin
    .from('wishlist_signals')
    .select('id, summary, verbatim')
    .eq('triage_outcome', 'pending')
    .is('area', null)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = (data as any[]) ?? []
  if (rows.length === 0) return 0

  const sys = await buildSystemInstruction('wishlist_area_taxonomy', AREA_FALLBACK)
  let done = 0
  for (let i = 0; i < rows.length; i += CAT_BATCH) {
    if (Date.now() > deadline) break
    const batch = rows.slice(i, i + CAT_BATCH)
    const prompt = [
      'ÁREAS canônicas (use SOMENTE estas; se nenhuma servir, "outros"):',
      areas.map((a) => `- ${a}`).join('\n'),
      '',
      'Classifique CADA pedido abaixo em UMA área, pelo significado:',
      batch.map((s) => `- [${s.id}] ${String(s.summary ?? s.verbatim ?? '').slice(0, 200)}`).join('\n'),
      '',
      'Responda SOMENTE com JSON {"itens":[{"id":"<id>","area":"<área>"}]} incluindo TODOS.',
    ].join('\n')
    let parsed: any = null
    try {
      const res = await Promise.race([
        generateText(prompt, { systemInstruction: sys, temperature: 0, maxOutputTokens: 1200, responseMimeType: 'application/json', disableThinking: true }),
        new Promise<never>((_, rej) => setTimeout(() => rej(new Error('llm timeout')), LLM_TIMEOUT_MS)),
      ])
      parsed = res?.result ? safeParseLLMJson(res.result) : null
    } catch (e) {
      console.error('[wishlist-enrich] categorize error:', e instanceof Error ? e.message : e)
      continue
    }
    const arr: any[] = Array.isArray(parsed) ? parsed : (parsed?.itens ?? parsed?.items ?? [])
    const byId = new Map<string, string>()
    for (const it of arr) {
      const id = String(it?.id ?? '').trim()
      let area = String(it?.area ?? '').trim().toLowerCase()
      if (!id) continue
      if (!areaSet.has(area)) area = 'outros'
      byId.set(id, area)
    }
    // Persiste cada sinal do lote (sinais sem retorno do modelo caem em "outros" p/ não reprocessar à toa).
    for (const s of batch) {
      const area = byId.get(s.id) ?? 'outros'
      await admin.from('wishlist_signals').update({ area }).eq('id', s.id)
      done++
    }
  }
  return done
}

/**
 * B) Pré-casa com o catálogo de features POR CLUSTER (não por sinal): 1 chamada de IA por grupo,
 * aplicada a TODOS os membros (mesmo pedido = mesmo match). Corta o gargalo do match por-sinal
 * (o catálogo inteiro no contexto é caro) e resolve os grupos multi-conta de uma vez. `limitClusters`
 * = quantos grupos casar por execução; maiores primeiro (mais valor por chamada).
 */
export async function matchSignalsCatalog(limitClusters: number, deadline: number): Promise<number> {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin
    .from('wishlist_signals')
    .select('id, cluster_key, summary, verbatim')
    .eq('triage_outcome', 'pending')
    .is('enriched_at', null)
    .not('cluster_key', 'is', null)
  const rows = (data as any[]) ?? []
  if (rows.length === 0) return 0

  // Agrupa por cluster; representante = o sinal cujo id == cluster_key (ou o primeiro do grupo).
  const byCluster = new Map<string, { rep: any; members: any[] }>()
  for (const s of rows) {
    const g = byCluster.get(s.cluster_key) ?? { rep: null, members: [] as any[] }
    g.members.push(s)
    if (s.id === s.cluster_key) g.rep = s
    byCluster.set(s.cluster_key, g)
  }
  const clusters = [...byCluster.entries()]
    .map(([key, g]) => ({ key, rep: g.rep ?? g.members[0], size: g.members.length }))
    .sort((a, b) => b.size - a.size)

  // OTIMIZAÇÃO (pré-filtro por embedding): embeda as features do catálogo UMA vez por run e, por
  // cluster, manda ao LLM só as TOP_K mais similares — prompt menor, mais barato e mais focado
  // (antes ia o catálogo inteiro a cada chamada). Se o embed falhar, cai no catálogo completo.
  const TOP_K = 12
  const features = await loadActiveFeatures()
  const featVecs: Array<{ f: CatalogFeature; vec: number[] }> = []
  for (let i = 0; i < features.length; i += CONCURRENCY) {
    if (Date.now() > deadline) break
    const batch = features.slice(i, i + CONCURRENCY)
    const vecs = await Promise.all(batch.map(async (f) => {
      try { const { result } = await generateEmbedding(`${f.name}. ${f.description ?? ''}`.slice(0, 500), { allowFallback: true }); return Array.isArray(result) && result.length ? result : null }
      catch { return null }
    }))
    batch.forEach((f, j) => { if (vecs[j]) featVecs.push({ f, vec: vecs[j]! }) })
  }

  let done = 0
  for (const c of clusters) {
    if (done >= limitClusters || Date.now() > deadline) break
    const text = String(c.rep.summary ?? '').trim() || String(c.rep.verbatim ?? '').trim()
    let match: any = null
    if (text.length >= 8) {
      let candidates = features
      if (featVecs.length) {
        try {
          const { result: rv } = await generateEmbedding(text, { allowFallback: true })
          if (Array.isArray(rv) && rv.length) {
            candidates = featVecs.map((fv) => ({ f: fv.f, sim: cosine(rv, fv.vec) })).sort((a, b) => b.sim - a.sim).slice(0, TOP_K).map((x) => x.f)
          }
        } catch { /* usa o catálogo completo */ }
      }
      try { match = await matchAgainstFeatures(text, candidates) } catch { match = null }
    }
    // Aplica o match a todos os membros pendentes ainda não casados do cluster.
    await admin.from('wishlist_signals')
      .update({ catalog_match: match, enriched_at: new Date().toISOString() })
      .eq('cluster_key', c.key).eq('triage_outcome', 'pending').is('enriched_at', null)
    done++
  }
  return done
}

/**
 * C) Agrupa os sinais pendentes em clusters por embedding (greedy por cosseno). O cluster_key é o id
 * do sinal mais representativo (primeiro do cluster). Permite a triagem aprovar um grupo de uma vez.
 */
export async function clusterSignals(deadline: number): Promise<number> {
  const admin = getSupabaseAdminClient() as any
  // INCREMENTAL: só processa sinais AINDA sem cluster. Quando tudo já está clusterizado, é no-op
  // imediato — evita re-embeddar os 564 a cada ciclo (o que starvava o match). Novos sinais são
  // atribuídos ao cluster existente mais similar, ou viram um cluster novo.
  const { data: newRows } = await admin
    .from('wishlist_signals')
    .select('id, summary, verbatim')
    .eq('triage_outcome', 'pending')
    .is('cluster_key', null)
    .order('created_at', { ascending: false })
    .limit(MAX_CLUSTER)
  const news = (newRows as any[]) ?? []
  if (news.length === 0) return 0

  // Representantes dos clusters existentes (o sinal semente = aquele cujo id == cluster_key).
  const { data: repRows } = await admin
    .from('wishlist_signals')
    .select('id, cluster_key, summary, verbatim')
    .eq('triage_outcome', 'pending')
    .not('cluster_key', 'is', null)
  const reps = ((repRows as any[]) ?? []).filter((r) => r.id === r.cluster_key)

  const embedText = async (s: any): Promise<number[] | null> => {
    const text = String(s.summary ?? s.verbatim ?? '').trim()
    if (text.length < 8) return null
    try { const { result } = await generateEmbedding(text, { allowFallback: true }); return Array.isArray(result) && result.length ? result : null }
    catch { return null }
  }

  // Embeda os representantes existentes + os novos (concorrência baixa, respeitando o deadline).
  const clusters: Array<{ key: string; vec: number[] }> = []
  for (let i = 0; i < reps.length; i += CONCURRENCY) {
    if (Date.now() > deadline) break
    const batch = reps.slice(i, i + CONCURRENCY)
    const vecs = await Promise.all(batch.map(embedText))
    batch.forEach((r, j) => { if (vecs[j]) clusters.push({ key: r.cluster_key, vec: vecs[j]! }) })
  }

  let done = 0
  for (let i = 0; i < news.length; i += CONCURRENCY) {
    if (Date.now() > deadline) break
    const batch = news.slice(i, i + CONCURRENCY)
    const vecs = await Promise.all(batch.map(embedText))
    for (let j = 0; j < batch.length; j++) {
      const v = vecs[j]; if (!v) continue
      let best: { key: string; sim: number } | null = null
      for (const c of clusters) {
        const sim = cosine(v, c.vec)
        if (sim >= SIM_THRESHOLD && (!best || sim > best.sim)) best = { key: c.key, sim }
      }
      const key = best ? best.key : batch[j].id
      if (!best) clusters.push({ key, vec: v })
      await admin.from('wishlist_signals').update({ cluster_key: key }).eq('id', batch[j].id)
      done++
    }
  }
  return done
}

/** D) Calcula o rice_score dos itens que ainda não têm (sem IA — só leitura+cálculo). */
export async function scoreUnscoredItems(limit: number): Promise<number> {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin.from('wishlist_items').select('id').is('rice_score', null).limit(limit)
  const rows = (data as any[]) ?? []
  let done = 0
  for (const it of rows) { try { await recomputeItemRice(it.id); done++ } catch { /* ignora */ } }
  return done
}

export interface WishlistEnrichResult { categorized: number; matched: number; clustered: number; scored: number; duration_ms: number }

/** Roda um ciclo bounded de enriquecimento da Wishlist (chamado pelo orquestrador). */
export async function runWishlistEnrich(opts?: { budgetMs?: number }): Promise<WishlistEnrichResult> {
  const start = Date.now()
  const deadline = start + (opts?.budgetMs ?? 180000)
  // Ordem importa: categorizar (barato) e clusterizar (essencial p/ a triagem em lote) ANTES do
  // match de catálogo (lento — manda o catálogo inteiro no contexto). O match usa o tempo restante
  // e drena ao longo dos ciclos; a próxima iteração o tornará por-cluster (1 chamada por grupo).
  const categorized = await categorizeSignals(120, deadline)
  const clustered = await clusterSignals(deadline)
  const matched = await matchSignalsCatalog(40, deadline)
  const scored = await scoreUnscoredItems(50) // barato (sem IA); mantém o rice_score populado
  return { categorized, matched, clustered, scored, duration_ms: Date.now() - start }
}
