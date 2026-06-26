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

  if ((!interactions || interactions.length === 0) && (!tickets || tickets.length === 0)) {
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

  // 3.5 Curadoria humana — falsos positivos já refutados (não repetir o erro)
  const { data: curation } = await (supabase as any)
    .from('risk_curation_feedback')
    .select('decision, reason, risk_key, created_at')
    .eq('account_id', accountId)
    .eq('decision', 'false_positive')
    .order('created_at', { ascending: false })
    .limit(10)

  if (curation && curation.length > 0) {
    payload += `=== CURADORIA HUMANA — FALSOS POSITIVOS JÁ REFUTADOS ===\n`
    payload += `Um CSM revisou avaliações anteriores e marcou os pontos abaixo como FALSO POSITIVO. NÃO classifique novamente como risco pelos mesmos motivos, a menos que haja evidência NOVA e clara nas interações/tickets recentes acima.\n`
    curation.forEach((c: any) => {
      payload += `- [${(c.created_at || '').slice(0, 10)}]${c.risk_key ? ` (${c.risk_key})` : ''}: ${c.reason || 'sem motivo informado'}\n`
    })
    payload += `\n`
  }

  // 4. System instruction: fonte de verdade é o default do catálogo ('predictive_risk'),
  // editável em /admin/settings. Este fallback é só rede de segurança — nunca roda enquanto
  // o catálogo tiver default (sempre tem). Mantém o contrato exato consumido pelo parser.
  const systemInstruction = 'Você é um analista de risco de churn em Customer Success. Retorne APENAS um JSON válido, sem markdown: {"risk_score": <inteiro 0-100>, "sentiment_label": "positive"|"neutral"|"negative"|"at-risk", "ai_reasoning": "<até 3 frases>"}. Seja rígido: reclamações repetidas/bugs críticos/tom agressivo elevam o risk_score (70-100, at-risk); elogios e engajamento reduzem (0-30, positive).'

  // 5. Call LLM
  try {
    const response = await generateText(payload, {
      systemInstruction: await buildSystemInstruction('predictive_risk', systemInstruction),
      temperature: 0.1
    })

    const cleanJsonText = response.result.replace(/```json/g, '').replace(/```/g, '').trim()
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
