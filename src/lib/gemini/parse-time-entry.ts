import { generateText } from '@/lib/llm/gateway'
import type { ActivityType } from '@/lib/supabase/types'

export type ParsedTimeEntry = {
  activity_type: ActivityType
  parsed_hours: number
  parsed_description: string
  account_name_hint: string | null
  date: string
}

export async function parseTimeEntry(
  rawText: string,
  today: string
): Promise<ParsedTimeEntry> {
  const prompt = `Você é um assistente de Customer Success. Extraia informações de uma entrada de tempo escrita em linguagem natural por um CSM.

Entrada: "${rawText}"
Data de hoje: ${today}

Retorne APENAS um JSON válido com esta estrutura:
{
  "activity_type": "<tipo>",
  "parsed_hours": <número>,
  "parsed_description": "<descrição>",
  "account_name_hint": "<nome da conta ou null>",
  "date": "<YYYY-MM-DD>"
}

Tipos válidos para activity_type:
- "preparation"        → preparar deck, material, apresentação, proposta, documento para cliente
- "environment-analysis" → analisar dados, métricas, logs, ambiente, investigar problema
- "strategy"           → planejar estratégia, alinhamento interno sobre conta, pensar próximos passos
- "reporting"          → gerar relatório, dashboard, status report, resumo executivo
- "internal-meeting"   → reunião INTERNA com time Plannera, alinhamento sem o cliente
- "meeting"            → reunião COM O CLIENTE, apresentações gerais, alinhamento direto
- "onboarding"         → kickoff, implantação, treinamento inicial, go-live, configuração inicial
- "qbr"                → reunião trimestral de resultados (QBR), review estratégico de sucesso
- "other"              → qualquer outra atividade que não se encaixa acima

Conversão de tempo (parsed_hours deve ser número decimal):
- "2h" → 2.0
- "30min" ou "30 minutos" → 0.5
- "1h30" ou "1h30min" ou "1h e 30min" → 1.5
- "45min" → 0.75
- "2h15" → 2.25
- Sem menção de tempo → 1.0

Instruções:
- parsed_description: frase limpa descrevendo o que foi feito (sem o tempo, sem "eu passei X horas")
- account_name_hint: nome da empresa/conta se mencionado, senão null
- date: use ${today} se nenhuma data for mencionada; interprete "ontem", "segunda", etc. relativos à data de hoje`

  const { result: raw } = await generateText(prompt, { allowFallback: true })
  const json = raw.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim()

  const parsed = JSON.parse(json) as ParsedTimeEntry

  // Garantias de segurança
  if (!parsed.parsed_hours || parsed.parsed_hours <= 0) parsed.parsed_hours = 1.0
  if (!parsed.date) parsed.date = today

  return parsed
}
