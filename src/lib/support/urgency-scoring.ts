import { generateText } from '../llm/gateway'
import { buildSystemInstruction } from '../ai/ai-context'
import { getSupabaseAdminClient as createAdminClient } from '../supabase/admin'

export interface UrgencyResult {
  score: 'low' | 'medium' | 'high'
  reasoning: string
}

/**
 * Analyzes a ticket's urgency using Gemini AI based on its title, initial body, 
 * and conversation history. Updates the database with the result.
 */
export async function scoreTicketUrgency(ticketId: string): Promise<UrgencyResult | null> {
  const supabase = createAdminClient()
  
  // 1. Fetch ticket and conversation history
  const { data: ticket, error: ticketError } = await supabase
    .from('support_tickets')
    .select('title, description, account_id')
    .eq('id', ticketId)
    .single()

  if (ticketError || !ticket) {
    console.error(`[UrgencyScoring] Ticket ${ticketId} not found.`)
    return null
  }

  const { data: messages } = await supabase
    .from('support_ticket_messages')
    .select('body, type, created_at')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: true })

  // 2. Prepare context for AI
  const history = messages?.map(m => 
    `[${m.type === 'reply' ? 'CLIENTE' : 'AGENTE'}] ${m.body}`
  ).join('\n') || 'Sem histórico adicional.'

  const prompt = `
Título do Ticket: ${ticket.title}
Descrição Inicial: ${ticket.description}

Histórico da Conversa:
${history}

Analise a urgência deste ticket considerando:
1. Impacto no negócio (S&OP/S&OE).
2. Frustração ou tom do cliente.
3. Se há um "bloqueador" crítico mencionado.

Responda estritamente em JSON no seguinte formato:
{
  "score": "high" | "medium" | "low",
  "reasoning": "Sua explicação curta aqui"
}
`

  const systemInstruction = `Você é um analista sênior de Customer Success especializado em S&OP. Sua missão é classificar a urgência de tickets de suporte para priorização da equipe.`

  try {
    // 3. Call LLM Gateway
    const response = await generateText(prompt, {
      systemInstruction: await buildSystemInstruction('support_urgency', systemInstruction),
      disableThinking: true,
      temperature: 0,
      maxOutputTokens: 500
    })

    // 4. Parse response
    // Clean potential markdown blocks from AI response
    const cleanJson = response.result.replace(/```json|```/g, '').trim()
    const result = JSON.parse(cleanJson) as UrgencyResult

    // 5. Persist result
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        urgency_score: result.score,
        urgency_reasoning: { text: result.reasoning },
        urgency_scored_at: new Date().toISOString()
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error(`[UrgencyScoring] Failed to update ticket ${ticketId}:`, updateError)
    }

    return result
  } catch (err) {
    console.error(`[UrgencyScoring] Error processing ticket ${ticketId}:`, err)
    return null
  }
}
