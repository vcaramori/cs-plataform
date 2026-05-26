import { generateText } from '@/lib/llm/gateway'
import type { ActivityType } from '@/lib/supabase/types'

export type ParsedTimeEntry = {
  activity_type: ActivityType
  parsed_hours: number
  parsed_description: string
  account_name_hint: string | null
  date: string
  confidence_score: number
}

export async function parseTimeEntry(
  rawText: string,
  today: string
): Promise<ParsedTimeEntry> {
  const prompt = `Você é um assistente de Customer Success de alto nível. Extraia informações de uma entrada de tempo escrita em linguagem natural por um CSM ou de uma transcrição inteira de reunião.
  
Entrada: "${rawText}"
Data de hoje: ${today}

Retorne APENAS um JSON válido com esta estrutura:
{
  "activity_type": "<tipo>",
  "parsed_hours": <número>,
  "parsed_description": "<descrição detalhada em texto>",
  "account_name_hint": "<nome da conta ou null>",
  "date": "<YYYY-MM-DD>",
  "confidence_score": <número entre 0.0 e 1.0>
}

Critérios para confidence_score:
- 1.0: texto claro com tipo, duração, descrição e conta todos explícitos
- 0.9: um campo deduzido com alta certeza (ex: data implícita como "ontem")
- 0.7-0.8: tipo de atividade ou conta ambíguos, mas interpretação razoável
- 0.5-0.6: múltiplas informações ausentes, entrada muito curta ou vaga
- < 0.5: entrada praticamente impossível de interpretar com precisão

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
- Sem menção de tempo explícita na transcrição, assuma 1.0

Instruções CRÍTICAS e OBRIGATÓRIAS para o \`parsed_description\`:
1. NÃO SEJA BREVE. Escreva um relato extremamente rico, detalhado, denso e completo de NO MÍNIMO 300 PALAVRAS. Extraia absolutamente todo o valor da transcrição/texto fornecido.
2. O relato deve ser OBRIGATORIAMENTE estruturado em 4 seções/capítulos numerados bem definidos:
   "1. CONTEXTO E OBJETIVOS DA ATIVIDADE\\n<Texto explicando detalhadamente o cenário, objetivos e a razão do esforço/reunião>\\n\\n2. PRINCIPAIS TÓPICOS DISCUTIDOS E DELIBERAÇÕES\\n<Texto listando os pontos centrais que foram debatidos, decisões tomadas e alinhamentos de processo de forma aprofundada>\\n\\n3. ALINHAMENTO DE EXPECTATIVAS, OBJEÇÕES E PONTOS DE ATENÇÃO\\n<Texto detalhando críticas, resistências, riscos operacionais, dúvidas levantadas ou feedbacks qualitativos dados>\\n\\n4. PRÓXIMOS PASSOS E AÇÕES CORRETIVAS PACTUADAS\\n<Texto mapeando os compromissos, datas, responsabilidades e as ações práticas definidas a seguir>"
3. ATENÇÃO MÁXIMA: Escreva todo o JSON sem quebras de linha reais físicas (Enter/fim de linha no arquivo). Use a sequência de escape literal "\\n" (barra invertida e n) para quebra de linha. NUNCA insira quebras de linha físicas dentro de strings no JSON para evitar crash na deserialização do JSON.
4. Mantenha um tom altamente profissional, técnico e executivo.
5. Não mencione em primeira pessoa "eu fiz", "eu passei X horas" ou similares; foque nos fatos do projeto e no valor gerado para a conta cliente.

Instruções para os outros campos:
- account_name_hint: nome da empresa/conta se mencionado, senão null
- date: use ${today} se nenhuma data for mencionada; interprete "ontem", "segunda", etc. relativos à data de hoje`

  const { result: raw } = await generateText(prompt, { 
    allowFallback: true,
    disableThinking: true,
    maxOutputTokens: 4096,
    responseMimeType: 'application/json'
  })
  
  // Extração robusta de JSON (procura o primeiro { e o último })
  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const json = jsonMatch ? jsonMatch[0] : raw

  try {
    const parsed = JSON.parse(json) as ParsedTimeEntry
    
    // Garantias de segurança
    if (!parsed.parsed_hours || parsed.parsed_hours <= 0) parsed.parsed_hours = 1.0
    if (!parsed.date) parsed.date = today
    if (typeof parsed.confidence_score !== 'number' || parsed.confidence_score < 0 || parsed.confidence_score > 1) {
      parsed.confidence_score = 0.7
    }

    return parsed
  } catch (err) {
    console.error('[Gemini] Erro ao parsear JSON:', json)
    throw new Error('IA retornou formato inválido')
  }
}
