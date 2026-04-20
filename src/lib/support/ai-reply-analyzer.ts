import { generateText } from '../llm/gateway'

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

  const prompt = `
Você é um assistente de Customer Success de elite. Analise a resposta de um agente de suporte e identifique:
1. O desfecho sugerido para o chamado.
2. Se o agente prometeu um retorno em uma data/hora específica.

MENSAGEM DO AGENTE:
"${replyBody}"

---
CONTEXTO TEMPORAL:
Agora são: ${now} (Horário de Brasília)

${category ? `CATEGORIA DO CHAMADO: ${category}` : ''}

---
REGRAS DE CLASSIFICAÇÃO (aplique na ordem):
1. "pending_client": Use SEMPRE que o agente fizer uma pergunta ao cliente, pedir informação, solicitar arquivo, pedir confirmação, pedir teste ou pedir qualquer tipo de ação do cliente. Palavras-chave: "poderia", "você pode", "consegue", "me envie", "aguardamos", "por gentileza", "podemos confirmar?", "você verificou?".
2. "pending_product": Use quando o agente mencionou que vai acionar o time de Produto, Engenharia, reportou um bug internamente, ou identificou um problema no sistema${isBugCategory ? ' — esta categoria já é Bug/Erro, então dê preferência a esta opção se houver menção de problema identificado' : ''}.
3. "solution": Use quando o agente resolveu o problema, enviou a solução definitiva ou confirmou o encerramento.
4. "none": Use apenas se for um acompanhamento neutro sem solicitar nada do cliente e sem alterar o estado.

ATENÇÃO: Se a mensagem contém QUALQUER pergunta ou solicitação ao cliente, o resultado DEVE ser "pending_client".

---
INSTRUÇÃO DE DATA:
- Se o agente disse algo como "falo com você amanhã às 10h", extraia "2026-04-19T10:00:00".
- Se não houver promessa de data/hora, retorne null.

---
RESPOSTA FORMATADA (JSON APENAS):
{
  "suggested_outcome": "solution" | "pending_client" | "pending_product" | "none",
  "promised_at": "ISO_TIMESTAMP" | null,
  "reasoning": "Breve explicação do porquê"
}
`

  try {
    const { result } = await generateText(prompt, {
      temperature: 0,
      provider: 'gemini',
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
