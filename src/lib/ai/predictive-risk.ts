import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'

export interface PredictiveRiskResult {
  risk_score: number
  sentiment_label: 'positive' | 'neutral' | 'negative' | 'at-risk'
  ai_reasoning: string
}

export async function runPredictiveRiskAnalysis(accountId: string): Promise<PredictiveRiskResult | null> {
  const supabase = getSupabaseAdminClient()

  // 1. Fetch recent interactions
  const { data: interactions, error: intError } = await supabase
    .from('interactions')
    .select('title, raw_transcript, type, date')
    .eq('account_id', accountId)
    .order('date', { ascending: false })
    .limit(10)

  if (intError) {
    console.error('[Predictive Risk] Error fetching interactions:', intError)
    return null
  }
  console.log(`[Predictive Risk] Found ${interactions?.length || 0} interactions for account ${accountId}`)

  // 2. Fetch recent support tickets
  const { data: tickets, error: tckError } = await supabase
    .from('support_tickets')
    .select('title, description, status, created_at')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(5)

  if (tckError) {
    console.error('[Predictive Risk] Error fetching tickets:', tckError)
    return null
  }
  console.log(`[Predictive Risk] Found ${tickets?.length || 0} tickets for account ${accountId}`)

  if ((!interactions || interactions.length === 0) && (!tickets || tickets.length === 0)) {
    console.log(`[Predictive Risk] No data to analyze for account ${accountId}`)
    return null
  }

  // 3. Prepare the text payload
  let payload = `Analise o risco de churn deste cliente com base nas interações e tickets recentes.\n\n`
  
  payload += `=== INTERAÇÕES RECENTES ===\n`
  interactions?.forEach(i => {
    payload += `[${i.date}] ${i.type.toUpperCase()}: ${i.title}\n${i.raw_transcript || '(sem transcrição)'}\n\n`
  })

  payload += `=== TICKETS DE SUPORTE RECENTES ===\n`
  tickets?.forEach(t => {
    payload += `[${t.created_at}] STATUS: ${t.status}\nTítulo: ${t.title}\nDescrição: ${t.description}\n\n`
  })

  // 4. Prompt system instruction
  const systemInstruction = `
Você é um especialista em Customer Success (CSM) e Analista de Risco de Churn.
O usuário enviará um log de interações e tickets recentes de um cliente.
Sua tarefa é analisar o sentimento do cliente e prever o risco de churn (cancelamento).

Você DEVE retornar APENAS um JSON válido com o seguinte formato, sem nenhum markdown ou texto extra:
{
  "risk_score": <número inteiro de 0 a 100, onde 0 é nenhum risco e 100 é churn iminente>,
  "sentiment_label": <string, estritamente um dos seguintes valores: "positive", "neutral", "negative", "at-risk">,
  "ai_reasoning": <string, uma justificativa clara e executiva de no máximo 3 frases explicando o motivo da nota>
}

Seja rígido na análise. Reclamações repetidas, bugs críticos e tons agressivos aumentam consideravelmente o risk_score para a faixa de 70-100 (at-risk). Elogios e engajamento diminuem para 0-30 (positive).
`

  // 5. Call LLM
  try {
    const response = await generateText(payload, {
      systemInstruction: await buildSystemInstruction('predictive_risk', systemInstruction),
      temperature: 0.1
    })

    const cleanJsonText = response.result.replace(/```json/g, '').replace(/```/g, '').trim()
    console.log('[Predictive Risk] LLM Result:', cleanJsonText)
    const result = JSON.parse(cleanJsonText) as PredictiveRiskResult

    // 6. Save to database
    const { error: insertError } = await supabase
      .from('account_risk_assessments')
      .insert({
        account_id: accountId,
        risk_score: result.risk_score,
        sentiment_label: result.sentiment_label,
        ai_reasoning: result.ai_reasoning
      })

    if (insertError) {
      console.error('[Predictive Risk] Error saving assessment:', insertError)
    }

    return result
  } catch (error) {
    console.error('[Predictive Risk] LLM Error:', error)
    return null
  }
}
