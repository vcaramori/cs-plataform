import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from '@/lib/llm/gateway'

/**
 * Clustering de temas de VoC por IA (embeddings) → popula `voc_theme_synonyms`.
 *
 * PROBLEMA: a extração de temas gera labels livres e muito específicos (ex.: "granularidade de
 * dados pós-fusão", "conflito origem faturamento planta vs CD"), resultando em ~1 ocorrência por
 * label. As "Top Dores/Elogios" do VoC ficam fragmentadas (não agregam). A normalização por
 * dicionário cobre pouco.
 *
 * SOLUÇÃO: embebe cada label distinto, agrupa por similaridade de cosseno (clustering guloso),
 * elege o label mais frequente do cluster como CANÔNICO e grava os demais como sinônimo→canônico.
 * O `buildVocSignals` já aplica `voc_theme_synonyms` na normalização → os temas passam a consolidar.
 *
 * IO-SAFE: NÃO armazena embeddings no Postgres (cluster em memória); só LÊ labels e ESCREVE
 * ~N linhas pequenas de sinônimo. As chamadas de embedding vão ao provedor (Gemini), não ao banco.
 */

// Cosseno — acima disso, "mesmo tema". 0.80 (era 0.86) é um STOPGAP: funde as quase-duplicatas
// textuais (família "performance…", "…manual") sem exigir texto idêntico. A consolidação semântica
// real (ex.: "performance" ↔ "lentidão na importação") é resolvida pela taxonomia canônica via IA
// (mapThemesToTaxonomy) — este clustering por embedding é frágil por construção e será aposentado.
const SIM_THRESHOLD = 0.80
const EMBED_CONCURRENCY = 5
const MAX_LABELS = 2500 // teto de segurança por execução

/** Mesma normalização do lookup em portfolio-voc (lowercase + sem acento) — para o synonym casar. */
function normKey(label: string): string {
  return label.trim().toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '')
}
function cosine(a: number[], b: number[]): number {
  let dot = 0, na = 0, nb = 0
  for (let i = 0; i < a.length; i++) { dot += a[i] * b[i]; na += a[i] * a[i]; nb += b[i] * b[i] }
  const denom = Math.sqrt(na) * Math.sqrt(nb)
  return denom ? dot / denom : 0
}

export interface ClusterResult { labels: number; embedded: number; clusters: number; synonyms: number; duration_ms: number }

export async function clusterVocThemes(opts?: { deadlineMs?: number }): Promise<ClusterResult> {
  const start = Date.now()
  const deadline = start + (opts?.deadlineMs ?? 240000)
  const admin = getSupabaseAdminClient() as any

  // 1) Labels distintos + frequência (o mais frequente do cluster vira o canônico).
  const { data: rows } = await admin.from('interaction_themes').select('theme')
  const freq = new Map<string, number>()
  for (const r of (rows as any[]) ?? []) {
    const t = String(r.theme ?? '').trim()
    if (t) freq.set(t, (freq.get(t) ?? 0) + 1)
  }
  const labels = [...freq.entries()].map(([label, count]) => ({ label, count }))
    .sort((a, b) => b.count - a.count).slice(0, MAX_LABELS)
  if (labels.length === 0) return { labels: 0, embedded: 0, clusters: 0, synonyms: 0, duration_ms: Date.now() - start }

  // 2) Embeddings (concorrência limitada; provedor externo, não toca o disco do Postgres).
  const vectors = new Map<string, number[]>()
  for (let i = 0; i < labels.length; i += EMBED_CONCURRENCY) {
    if (Date.now() > deadline) break
    const batch = labels.slice(i, i + EMBED_CONCURRENCY)
    await Promise.all(batch.map(async ({ label }) => {
      try {
        const { result } = await generateEmbedding(label, { allowFallback: true })
        if (Array.isArray(result) && result.length) vectors.set(label, result)
      } catch { /* ignora label que falhar ao embedar */ }
    }))
  }

  // 3) Clustering guloso por cosseno. Processa em ordem de frequência → canônico = 1º (mais frequente).
  const clusters: Array<{ canonical: string; vec: number[]; members: string[] }> = []
  for (const { label } of labels) {
    const v = vectors.get(label)
    if (!v) continue
    let best: { c: { canonical: string; vec: number[]; members: string[] }; sim: number } | null = null
    for (const c of clusters) {
      const sim = cosine(v, c.vec)
      if (sim >= SIM_THRESHOLD && (!best || sim > best.sim)) best = { c, sim }
    }
    if (best) best.c.members.push(label)
    else clusters.push({ canonical: label, vec: v, members: [label] })
  }

  // 4) synonym→canonical apenas para clusters com 2+ membros (o canônico não vira sinônimo).
  const bySyn = new Map<string, string>()
  for (const c of clusters) {
    if (c.members.length < 2) continue
    for (const m of c.members) {
      if (m === c.canonical) continue
      const key = normKey(m)
      if (key && !bySyn.has(key)) bySyn.set(key, c.canonical)
    }
  }
  const finalRows = [...bySyn.entries()].map(([synonym, canonical]) => ({ synonym, canonical }))
  for (let i = 0; i < finalRows.length; i += 200) {
    await admin.from('voc_theme_synonyms').upsert(finalRows.slice(i, i + 200), { onConflict: 'synonym' })
  }

  return { labels: labels.length, embedded: vectors.size, clusters: clusters.length, synonyms: finalRows.length, duration_ms: Date.now() - start }
}
