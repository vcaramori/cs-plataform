import { generateText } from '@/lib/llm/gateway'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export type ShadowScoreResult = {
  score: number
  trend: 'improving' | 'stable' | 'declining' | 'critical'
  justification: string
  risk_factors: string[]
  confidence: 'high' | 'medium' | 'low'
}

export async function generateShadowScore(accountId: string): Promise<ShadowScoreResult> {
  const supabase = getSupabaseAdminClient()

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  // Busca contexto: últimas 10 interações + últimos 10 tickets
  const [{ data: interactions }, { data: tickets }] = await Promise.all([
    db
      .from('interactions')
      .select('title, date, type, direct_hours, sentiment_score, alert_triggered, raw_transcript')
      .eq('account_id', accountId)
      .order('date', { ascending: false })
      .limit(10),
    db
      .from('support_tickets')
      .select('title, description, status, priority, category, opened_at, resolved_at')
      .eq('account_id', accountId)
      .order('opened_at', { ascending: false })
      .limit(10),
  ]) as [{ data: any[] | null }, { data: any[] | null }]

  if ((!interactions || interactions.length === 0) && (!tickets || tickets.length === 0)) {
    return {
      score: 50,
      trend: 'stable',
      justification: 'Dados insuficientes para gerar Shadow Score. Adicione interações ou tickets para este LOGO.',
      risk_factors: ['insufficient_data'],
      confidence: 'low',
    }
  }

  // Monta contexto para o Gemini
  const interactionsContext = (interactions ?? []).map((i) => {
    const sentiment = i.sentiment_score !== null
      ? ` | Sentimento: ${Number(i.sentiment_score).toFixed(2)}`
      : ''
    const alert = i.alert_triggered ? ' | ⚠️ Alerta ativado' : ''
    const snippet = i.raw_transcript ? ` | Trecho: "${i.raw_transcript.slice(0, 200)}..."` : ''
    return `- [${i.date}] ${i.type.toUpperCase()}: ${i.title}${sentiment}${alert}${snippet}`
  }).join('\n')

  const ticketsContext = (tickets ?? []).map((t) => {
    const resolved = t.resolved_at ? ` | Resolvido: ${t.resolved_at}` : ' | ABERTO'
    return `- [${t.opened_at}] ${t.priority.toUpperCase()}: ${t.title} (${t.status})${resolved}\n  ${t.description?.slice(0, 150) ?? ''}`
  }).join('\n')

  const prompt = `Você é um especialista em Customer Success. Analise os dados abaixo e gere um Shadow Health Score para este LOGO.

## Interações recentes
${interactionsContext || 'Nenhuma interação registrada'}

## Chamados de suporte recentes
${ticketsContext || 'Nenhum chamado registrado'}

## Instruções
Retorne APENAS um JSON válido com esta estrutura exata:
{
  "score": <número inteiro de 0 a 100>,
  "trend": "improving" | "stable" | "declining" | "critical",
  "justification": "<2-3 frases explicando o score, baseado nos dados acima>",
  "risk_factors": ["<fator1>", "<fator2>"],
  "confidence": "high" | "medium" | "low"
}

## Critérios de score
- 80-100: Cliente saudável, engajado, poucos problemas
- 60-79: Estável, mas com pontos de atenção
- 40-59: Risco moderado, precisa de atenção ativa
- 20-39: Alto risco, intervenção necessária
- 0-19: Risco crítico de churn

## Fatores de risco possíveis
critical_tickets, unresolved_tickets, negative_sentiment, low_engagement,
declining_meetings, churn_signals, payment_issues, integration_failures,
escalation_risk, insufficient_data

## Trend
- improving: melhora nos últimos registros
- stable: sem mudanças significativas
- declining: piora nos últimos registros
- critical: situação crítica imediata`

  const { result: raw, provider } = await generateText(prompt, { allowFallback: true, timeoutMs: 120000 })
  console.log(`[Shadow Score] Resposta bruta do ${provider}: ${raw}`)

  try {
    // Extração robusta de JSON: busca o primeiro '{' e o último '}'
    const firstBrace = raw.indexOf('{')
    const lastBrace = raw.lastIndexOf('}')
    
    if (firstBrace === -1 || lastBrace === -1) {
      throw new Error('A resposta da IA não contém um objeto JSON válido.')
    }

    const jsonString = raw.slice(firstBrace, lastBrace + 1).trim()
    const parsed = JSON.parse(jsonString) as ShadowScoreResult
    
    // Validação básica de campos obrigatórios
    if (typeof parsed.score !== 'number') throw new Error('Campo "score" ausente ou inválido.')
    
    parsed.score = Math.max(0, Math.min(100, Math.round(parsed.score)))
    return parsed
  } catch (err: any) {
    console.error(`[Shadow Score] Falha ao parsear JSON. Erro: ${err.message}. Payload: ${raw}`)
    throw new Error(`Resposta da IA inválida para análise: ${err.message}`)
  }
}
