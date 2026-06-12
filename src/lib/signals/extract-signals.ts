import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import { persistWishlistSignals } from '@/lib/wishlist/extractor'
import { persistOpportunitySignals } from '@/lib/opportunities/persist'
import { getSopGlossary, renderGlossary } from '@/lib/opportunities/glossary'
import type { ExtractedSignal, WishlistKind } from '@/lib/wishlist/types'
import type { ExtractedOpportunity, OpportunityType } from '@/lib/opportunities/types'

const MIN_TEXT_LENGTH = 40
const MIN_CONFIDENCE = 0.55

export type SignalSource = 'interaction' | 'time_entry' | 'nps_response' | 'support_ticket' | 'manual'

export interface ExtractSignalsInput {
  text: string
  accountId: string
  sourceType: SignalSource
  sourceId?: string | null
  createdBy?: string | null
  requesterEmail?: string | null
  contextHint?: string
}

const SYSTEM_INSTRUCTION = `Você é um analista de Customer Success de uma plataforma SaaS de S&OP/S&OE para indústria e MRO.
Leia o texto (transcrição de reunião, nota de esforço, comentário de NPS ou ticket) e separe DOIS tipos de sinal:

1) WISHLIST — pedidos/necessidades de PRODUTO sobre o NOSSO produto (algo que a ferramenta deveria fazer/melhorar).
   - "kind": "enhancement" se já existe e precisa melhorar; "new" se pede algo que não parece existir.

2) OPPORTUNITIES — sinais COMERCIAIS (de gerar receita), NÃO pedidos de produto:
   - "upsell_plan": o cliente precisa de algo que JÁ EXISTE num plano superior (subir de plano).
   - "system_need": menciona a necessidade de um SISTEMA/MÓDULO correlato a S&OP (use o glossário abaixo para reconhecer siglas como MPS, DRP, MRO etc.).
   - "end_to_end_gap": pede uma solução end-to-end que respondemos NÃO ter.
   - "other": outro sinal comercial claro.

Regras:
- Um mesmo trecho normalmente é wishlist OU oportunidade, não os dois. Pedido de funcionalidade do nosso produto = wishlist. Necessidade de um sistema/módulo novo, upgrade de plano ou solução que não temos = oportunidade.
- "verbatim": cite o cliente de forma fiel e curta. "summary": uma frase objetiva.
- "confidence" (0..1): o quão claramente é daquele tipo.
- Se não houver nada de um tipo, retorne lista vazia para ele. NÃO invente.
Responda SOMENTE em JSON:
{"wishlist":[{"verbatim":"...","summary":"...","kind":"new|enhancement","requester":"nome ou null","confidence":0.0}],
 "opportunities":[{"verbatim":"...","summary":"...","opportunity_type":"upsell_plan|system_need|end_to_end_gap|other","requester":"nome ou null","confidence":0.0}]}`

const VALID_OPP: OpportunityType[] = ['upsell_plan', 'system_need', 'end_to_end_gap', 'other']

function stripFences(raw: string): string {
  let txt = raw.trim()
  if (txt.startsWith('```')) txt = txt.replace(/^```(?:json)?/i, '').replace(/```$/, '').trim()
  return txt
}

/**
 * Extração UNIFICADA (passada única de IA): de um texto livre, extrai e persiste
 * sinais de WISHLIST e de OPORTUNIDADE numa só chamada. Idempotente por (source_type,
 * source_id) em cada módulo. Nunca lança — falhas são logadas. Retorna as contagens.
 */
export async function extractSignals(input: ExtractSignalsInput): Promise<{ wishlist: number; opportunities: number }> {
  const { text, accountId, sourceType, sourceId, createdBy, requesterEmail, contextHint } = input
  if (!text || text.trim().length < MIN_TEXT_LENGTH) return { wishlist: 0, opportunities: 0 }

  try {
    const glossary = renderGlossary(await getSopGlossary())
    const prompt = [
      contextHint ? contextHint : '',
      glossary ? `Glossário de sistemas/siglas correlatos a S&OP:\n${glossary}` : '',
      `Texto:\n${text.slice(0, 8000)}`,
    ].filter(Boolean).join('\n\n')

    const { result } = await generateText(prompt, {
      systemInstruction: await buildSystemInstruction('signal_extractor', SYSTEM_INSTRUCTION),
      responseMimeType: 'application/json',
      temperature: 0,
      allowFallback: true,
    })

    let parsed: { wishlist?: any[]; opportunities?: any[] }
    try {
      parsed = JSON.parse(stripFences(result))
    } catch {
      console.error('[signals/extract] JSON inválido')
      return { wishlist: 0, opportunities: 0 }
    }

    const wishlist: ExtractedSignal[] = (Array.isArray(parsed.wishlist) ? parsed.wishlist : [])
      .filter((s: any) => s && typeof s.summary === 'string' && typeof s.verbatim === 'string')
      .map((s: any) => ({
        verbatim: String(s.verbatim).slice(0, 1000),
        summary: String(s.summary).slice(0, 500),
        kind: (s.kind === 'enhancement' ? 'enhancement' : 'new') as WishlistKind,
        requester: s.requester ? String(s.requester).slice(0, 160) : null,
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.6,
      }))
      .filter((s) => s.confidence >= MIN_CONFIDENCE)

    const opportunities: ExtractedOpportunity[] = (Array.isArray(parsed.opportunities) ? parsed.opportunities : [])
      .filter((s: any) => s && typeof s.summary === 'string' && typeof s.verbatim === 'string')
      .map((s: any) => ({
        verbatim: String(s.verbatim).slice(0, 1000),
        summary: String(s.summary).slice(0, 500),
        opportunity_type: (VALID_OPP.includes(s.opportunity_type) ? s.opportunity_type : 'other') as OpportunityType,
        requester: s.requester ? String(s.requester).slice(0, 160) : null,
        confidence: typeof s.confidence === 'number' ? s.confidence : 0.6,
      }))
      .filter((s) => s.confidence >= MIN_CONFIDENCE)

    const [w, o] = await Promise.all([
      persistWishlistSignals({ signals: wishlist, accountId, sourceType, sourceId, createdBy, requesterEmail }),
      persistOpportunitySignals({ signals: opportunities, accountId, sourceType, sourceId, createdBy, requesterEmail }),
    ])

    return { wishlist: w, opportunities: o }
  } catch (err) {
    console.error('[signals/extract] failed:', err instanceof Error ? err.message : err)
    return { wishlist: 0, opportunities: 0 }
  }
}
