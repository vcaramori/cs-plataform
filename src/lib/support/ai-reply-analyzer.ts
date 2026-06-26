import { generateText } from '../llm/gateway'
import { buildSystemInstruction } from '../ai/ai-context'

export interface ReplyAnalysis {
  suggested_outcome: 'solution' | 'pending_client' | 'pending_product' | 'none'
  promised_at: string | null // ISO string
  reasoning: string
}

/**
 * Analyzes an agent's reply to suggest the next ticket state and detect follow-up promises.
 */
export async function analyzeAgentReply(replyBody: string, category?: string | null): Promise<ReplyAnalysis> {
  const now = new Date().toISOString()
  const isBugCategory = category?.toLowerCase().includes('bug') || category?.toLowerCase().includes('erro')

  const prompt = `MENSAGEM DO AGENTE:
"${replyBody}"

---
CONTEXTO TEMPORAL:
Agora são: ${now} (Horário de Brasília)

${category ? `CATEGORIA DO CHAMADO: ${category}` : ''}${isBugCategory ? ` (categoria Bug/Erro — em caso de menção a problema identificado no produto, prefira pending_product)` : ''}

---
Responda APENAS com o objeto JSON no formato:
{"suggested_outcome": "solution" | "pending_client" | "pending_product" | "none", "promised_at": "ISO_TIMESTAMP" | null, "reasoning": "Breve explicação"}`

  try {
    const { result } = await generateText(prompt, {
      systemInstruction: await buildSystemInstruction('support_reply_analysis'),
      temperature: 0,
      allowFallback: true,
    })
    const jsonMatch = result.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')
    const parsed = JSON.parse(jsonMatch[0]) as ReplyAnalysis

    return {
      suggested_outcome: parsed.suggested_outcome || 'none',
      promised_at: parsed.promised_at || null,
      reasoning: parsed.reasoning || ''
    }
  } catch (err) {
    console.error('[AI Reply Analyzer] Error:', err)
    return { suggested_outcome: 'none', promised_at: null, reasoning: 'Erro na análise' }
  }
}
