import { generateText } from '../llm/gateway'

export type TicketIntent = 'new_issue' | 'gratitude' | 'follow_up'

/**
 * Classifies the intent of an incoming support email using LLM.
 * 
 * Categories:
 * - gratitude: Just saying thanks, goodbye, or confirming resolution (Close)
 * - new_issue: Starting a completely different topic (Create New linked ticket)
 * - follow_up: Providing info, asking more questions, or reopening (Keep Open/Reopen)
 */
export async function classifyTicketIntent(
  subject: string,
  originalDescription: string,
  newMessage: string
): Promise<TicketIntent> {
  const prompt = `
Você é um triador inteligente de central de suporte. Seu papel é classificar a intenção de um novo e-mail recebido em relação a um ticket já existente.

TICKET ORIGINAL:
Assunto: ${subject}
Descrição: ${originalDescription}

NOVA MENSAGEM:
${newMessage}

---
CATEGORIAS:
1. "gratitude": O cliente está apenas agradecendo, confirmando que o problema foi resolvido ou encerrando a conversa de forma educada (ex: "Obrigado", "Funcionou!", "Pode fechar").
2. "new_issue": O cliente está trazendo um problema TOTALMENTE NOVO e diferente do assunto original (ex: resolvido o login, ele começa a perguntar de faturamento).
3. "follow_up": O cliente ainda tem dúvidas sobre o mesmo assunto, está fornecendo evidências extras ou está pedindo para reabrir pois o problema persistiu.

INSTRUÇÃO:
Responda APENAS com uma das palavras-chave: gratitude, new_issue ou follow_up.
`

  try {
    const { result } = await generateText(prompt, { temperature: 0 })
    const intent = result.toLowerCase().trim() as TicketIntent
    
    if (['gratitude', 'new_issue', 'follow_up'].includes(intent)) {
      return intent
    }
    
    console.warn(`[Intent Classifier] Unexpected LLM result: ${result}. Falling back to 'follow_up'.`)
    return 'follow_up'
  } catch (err) {
    console.error('[Intent Classifier] LLM Error:', err)
    return 'follow_up'
  }
}
