import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import { safeParseLLMJson } from '@/lib/llm/safe-json'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Enriquecimento ASSÍNCRONO da Voz do Cliente (rodado SÓ pelo cron `voc-enrich`).
 *
 * IMPORTANTE (lição do incidente de Disk-IO): tudo em LOTES PEQUENOS, concorrência baixa,
 * idempotente (marcadores `*_analyzed_at` / `themes_extracted_at`) e com ORÇAMENTO DE TEMPO.
 * Nunca rodar dentro de request de usuário nem dentro do sync em massa do Read.ai.
 * O input do LLM é truncado (transcrições gigantes não vão inteiras) para a chamada ser barata.
 */

const CONCURRENCY = 3
const LLM_TIMEOUT_MS = 15000

const SYS = 'Você é um analista de Customer Success de uma plataforma SaaS de S&OP/S&OE. Responda SEMPRE em PT-BR e SOMENTE com JSON válido (sem markdown, sem comentários).'

async function classify(prompt: string, maxTokens = 220): Promise<any | null> {
  try {
    const sys = await buildSystemInstruction('voc_enrichment', SYS)
    const res = await Promise.race([
      generateText(prompt, { systemInstruction: sys, temperature: 0.2, maxOutputTokens: maxTokens, responseMimeType: 'application/json', disableThinking: true }),
      new Promise<never>((_, rej) => setTimeout(() => rej(new Error('llm timeout')), LLM_TIMEOUT_MS)),
    ])
    if (!res?.result) return null
    return safeParseLLMJson(res.result)
  } catch (e) {
    console.error('[voc-enrich] LLM error:', e instanceof Error ? e.message : e)
    return null
  }
}

function clampScore(v: unknown): number | null {
  const n = typeof v === 'number' ? v : Number(v)
  if (!Number.isFinite(n)) return null
  return Math.max(-1, Math.min(1, Math.round(n * 1000) / 1000))
}
function cleanKeywords(v: unknown): string[] {
  if (!Array.isArray(v)) return []
  return [...new Set(v.map((x) => String(x).trim().toLowerCase()).filter((s) => s && s.length <= 40))].slice(0, 6)
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

/** NPS: sentimento + keywords do comentário (preenche nps_responses.sentiment_score/keywords). */
export async function enrichNpsComments(limit: number, deadline: number): Promise<number> {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin
    .from('nps_responses')
    .select('id, score, comment')
    .not('comment', 'is', null)
    .is('sentiment_analyzed_at', null)
    .eq('is_test', false)
    .order('created_at', { ascending: false })
    .limit(limit)
  const rows = (data as any[]) ?? []
  return runBatched(rows, async (n) => {
    const comment = String(n.comment ?? '').trim()
    if (comment.length < 3) {
      await admin.from('nps_responses').update({ sentiment_analyzed_at: new Date().toISOString() }).eq('id', n.id)
      return
    }
    const parsed = await classify(`Comentário de uma pesquisa NPS (nota ${n.score}/10). Classifique o sentimento e extraia temas curtos.\nRetorne JSON: {"sentiment_score": número entre -1 e 1, "keywords": [3-6 temas curtos em minúsculo]}\n\nComentário:\n${comment.slice(0, 1500)}`)
    const patch: Record<string, unknown> = { sentiment_analyzed_at: new Date().toISOString() }
    if (parsed) {
      const sc = clampScore(parsed.sentiment_score)
      if (sc != null) patch.sentiment_score = sc
      patch.sentiment_keywords = cleanKeywords(parsed.keywords)
    }
    await admin.from('nps_responses').update(patch).eq('id', n.id)
  }, deadline)
}

/** CSAT: keywords do comentário (a polaridade já vem da nota 1-5). */
export async function enrichCsatComments(limit: number, deadline: number): Promise<number> {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin
    .from('csat_responses')
    .select('id, score, comment')
    .not('comment', 'is', null)
    .is('sentiment_analyzed_at', null)
    .order('answered_at', { ascending: false })
    .limit(limit)
  const rows = (data as any[]) ?? []
  return runBatched(rows, async (c) => {
    const comment = String(c.comment ?? '').trim()
    if (comment.length < 3) {
      await admin.from('csat_responses').update({ sentiment_analyzed_at: new Date().toISOString() }).eq('id', c.id)
      return
    }
    const parsed = await classify(`Comentário de uma avaliação de atendimento (CSAT, nota ${c.score}/5). Extraia os temas curtos mencionados.\nRetorne JSON: {"keywords": [3-6 temas curtos em minúsculo]}\n\nComentário:\n${comment.slice(0, 1500)}`)
    await admin.from('csat_responses').update({
      sentiment_analyzed_at: new Date().toISOString(),
      sentiment_keywords: parsed ? cleanKeywords(parsed.keywords) : [],
    }).eq('id', c.id)
  }, deadline)
}

/** Interações: temas de DOR/ENCANTO da transcrição/resumo (popula interaction_themes). */
export async function enrichInteractionThemes(limit: number, deadline: number): Promise<number> {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin
    .from('interactions')
    .select('id, account_id, title, summary, raw_transcript')
    .is('themes_extracted_at', null)
    .or('raw_transcript.not.is.null,summary.not.is.null')
    .order('date', { ascending: false })
    .limit(limit)
  const rows = (data as any[]) ?? []
  return runBatched(rows, async (i) => {
    const text = (i.summary && String(i.summary).trim()) || (i.raw_transcript && String(i.raw_transcript).trim()) || ''
    const stamp = new Date().toISOString()
    if (text.length < 40) {
      await admin.from('interactions').update({ themes_extracted_at: stamp }).eq('id', i.id)
      return
    }
    const parsed = await classify(`Da interação/reunião a seguir, extraia os principais TEMAS de DOR (pain) e de ENCANTO (praise) do cliente sobre o produto/atendimento. Ignore assuntos neutros/operacionais.\nRetorne JSON: {"themes": [{"label": tema curto em minúsculo, "polarity": "pain"|"praise"|"neutral"}]} (máx 6).\n\nTítulo: ${i.title ?? '—'}\nTexto:\n${text.slice(0, 6000)}`, 320)
    const themes: Array<{ label: string; polarity: string }> = []
    if (parsed && Array.isArray(parsed.themes)) {
      for (const t of parsed.themes) {
        const label = String(t?.label ?? '').trim().toLowerCase()
        const polarity = ['pain', 'praise', 'neutral'].includes(t?.polarity) ? t.polarity : 'neutral'
        if (label && label.length <= 40) themes.push({ label, polarity })
      }
    }
    // Idempotente: limpa temas anteriores desta interação e regrava.
    await admin.from('interaction_themes').delete().eq('interaction_id', i.id)
    if (themes.length > 0) {
      await admin.from('interaction_themes').insert(themes.slice(0, 6).map((t) => ({ interaction_id: i.id, account_id: i.account_id, theme: t.label, polarity: t.polarity })))
    }
    await admin.from('interactions').update({ themes_extracted_at: stamp }).eq('id', i.id)
  }, deadline)
}

export interface VocEnrichResult { nps: number; csat: number; interactions: number; duration_ms: number }

/** Roda um ciclo bounded de enriquecimento (chamado pelo cron). */
export async function runVocEnrich(opts?: { budgetMs?: number }): Promise<VocEnrichResult> {
  const start = Date.now()
  const deadline = start + (opts?.budgetMs ?? 180000)
  // Ordem: NPS e CSAT (rápidos) primeiro; interações (texto maior) por último.
  const nps = await enrichNpsComments(15, deadline)
  const csat = await enrichCsatComments(15, deadline)
  const interactions = await enrichInteractionThemes(10, deadline)
  return { nps, csat, interactions, duration_ms: Date.now() - start }
}
