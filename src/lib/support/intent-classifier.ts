import { generateText } from '../llm/gateway'
import { buildSystemInstruction } from '../ai/ai-context'

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
  const prompt = `TICKET ORIGINAL:
Assunto: ${subject}
Descrição: ${originalDescription}

NOVA MENSAGEM:
${newMessage}

Responda apenas com um destes tokens, exatamente: gratitude, new_issue ou follow_up.`

  try {
    const { result } = await generateText(prompt, { systemInstruction: await buildSystemInstruction('support_intent'), temperature: 0 })
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

// Alias para compatibilidade com código legado
export const classifyIntent = classifyTicketIntent
