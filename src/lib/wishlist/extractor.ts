import { generateText } from '@/lib/llm/gateway'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import type { ExtractedSignal, WishlistKind, WishlistSignalSource } from './types'

const MIN_TEXT_LENGTH = 40
const MIN_CONFIDENCE = 0.55

const SYSTEM_INSTRUCTION = `Você é um analista de Customer Success de uma plataforma SaaS de S&OP/S&OE para indústria e MRO.
Sua tarefa: ler um texto (transcrição de reunião, nota de esforço, comentário de NPS ou ticket de suporte) e extrair APENAS pedidos/necessidades de PRODUTO do cliente — coisas que o cliente gostaria que a ferramenta fizesse para facilitar o trabalho dele.

Regras:
- Extraia somente desejos/solicitações de funcionalidade ou melhoria. NÃO extraia dúvidas operacionais, elogios, reclamações sem pedido, combinados de agenda ou tarefas internas do CSM.
- "kind" = "enhancement" quando o cliente quer que algo que já existe funcione melhor/diferente; "new" quando pede algo que não parece existir.
- "verbatim" deve citar o cliente do jeito mais fiel possível (curto). "summary" é uma frase objetiva do pedido.
- "confidence" (0..1) reflete o quão claramente é um pedido de produto.
- Se NÃO houver nenhum pedido genuíno, retorne {"signals": []}.
Responda SOMENTE com JSON no formato: {"signals":[{"verbatim":"...","summary":"...","kind":"new|enhancement","requester":"nome ou null","confidence":0.0}]}`

function parseSignals(raw: string): ExtractedSignal[] {
  let txt = raw.trim()
  // remove cercas markdown se vierem
  if (txt.startsWith('```')) txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  try {
    const parsed = JSON.parse(txt)
    const arr = Array.isArray(parsed) ? parsed : parsed?.signals
    if (!Array.isArray(arr)) return []
    return arr
      .filter((s: any) => s && typeof s.summary === 'string' && typeof s.verbatim === 'string')
      .map((s: any) => ({
        verbatim: String(s.verbatim).slice(0, 1000),
        summary: String(s.summary).slice(0, 500),
        kind: (s.kind === 'enhancement' ? 'enhancement' : 'new') as WishlistKind,
        requester: s.requester ? String(s.requester).slice(0, 160) : null,
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.6,
      }))
  } catch {
    return []
  }
}

export interface ExtractInput {
  text: string
  accountId: string
  sourceType: WishlistSignalSource
  sourceId?: string | null
  createdBy?: string | null
  requesterEmail?: string | null
  /** contexto opcional anexado ao prompt (ex.: "Comentário de detrator NPS (nota 3)") */
  contextHint?: string
}

/**
 * Extrai pedidos de produto de um texto livre e grava como `wishlist_signals`
 * (status pending, ai_extracted=true), embedando cada um para dedup cross-customer.
 * Idempotente por (source_type, source_id): re-ingestão substitui sinais anteriores da mesma origem.
 * Retorna o número de sinais criados. Nunca lança — falhas são logadas e ignoradas.
 */
export async function extractWishlistSignals(input: ExtractInput): Promise<number> {
  const { text, accountId, sourceType, sourceId, createdBy, requesterEmail, contextHint } = input
  if (!text || text.trim().length < MIN_TEXT_LENGTH) return 0

  try {
    const prompt = `${contextHint ? contextHint + '\n\n' : ''}Texto:\n${text.slice(0, 8000)}`
    const { result } = await generateText(prompt, {
      systemInstruction: await buildSystemInstruction('wishlist_extractor', SYSTEM_INSTRUCTION),
      responseMimeType: 'application/json',
      temperature: 0,
      allowFallback: true,
    })

    const extracted = parseSignals(result).filter((s) => s.confidence >= MIN_CONFIDENCE)
    if (extracted.length === 0) return 0

    return await persistWishlistSignals({ signals: extracted, accountId, sourceType, sourceId, createdBy, requesterEmail })
  } catch (err) {
    console.error('[wishlist/extractor] failed:', err instanceof Error ? err.message : err)
    return 0
  }
}

/**
 * Persiste sinais de wishlist já extraídos (idempotente por source). Reutilizado pela
 * extração unificada (`src/lib/signals/extract-signals.ts`) para não duplicar a lógica.
 */
export async function persistWishlistSignals(input: {
  signals: ExtractedSignal[]
  accountId: string
  sourceType: WishlistSignalSource
  sourceId?: string | null
  createdBy?: string | null
  requesterEmail?: string | null
}): Promise<number> {
  const { signals, accountId, sourceType, sourceId, createdBy, requesterEmail } = input
  if (!signals || signals.length === 0) return 0
  const db = getSupabaseAdminClient()

  // Re-ingestão segura: remove sinais IA anteriores desta mesma origem
  if (sourceId) {
    await db
      .from('wishlist_signals')
      .delete()
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .eq('ai_extracted', true)
  }

  const rows = signals.map((s) => ({
    account_id: accountId,
    source_type: sourceType,
    source_id: sourceId ?? null,
    verbatim: s.verbatim,
    summary: s.summary,
    kind: s.kind,
    requester_name: s.requester ?? null,
    requester_email: requesterEmail ?? null,
    created_by: createdBy ?? null,
    ai_extracted: true,
    ai_confidence: s.confidence,
  }))

  const { data: inserted, error } = await db
    .from('wishlist_signals')
    .insert(rows)
    .select('id, verbatim')

  if (error) {
    console.error('[wishlist/extractor] insert error:', error.message)
    return 0
  }

  await Promise.all(
    (inserted ?? []).map((sig: any) =>
      storeEmbeddings(accountId, 'wishlist_signal', sig.id, sig.verbatim).catch((e) =>
        console.error('[wishlist/extractor] embed error:', e?.message)
      )
    )
  )

  return inserted?.length ?? 0
}
