import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import type { ActivityType } from '@/lib/supabase/types'

export type ActionItem = {
  title: string
  due_date: string | null  // YYYY-MM-DD ou null
  description?: string | null  // contexto/porquê da tarefa (extraído da reunião/nota)
}

export type ParsedTimeEntry = {
  activity_type: ActivityType
  parsed_hours: number
  parsed_description: string
  account_name_hint: string | null
  date: string
  confidence_score: number
  action_items: ActionItem[]
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
  "confidence_score": <número entre 0.0 e 1.0>,
  "action_items": [
    { "title": "<ação concreta identificada>", "due_date": "<YYYY-MM-DD ou null>", "description": "<contexto curto da tarefa>" }
  ]
}

Regras para action_items:
- Extraia SOMENTE tarefas/ações concretas mencionadas na transcrição (ex: "enviar proposta", "agendar reunião de follow-up", "corrigir bug X", "preparar relatório para cliente")
- Se não houver ações identificáveis, retorne um array vazio []
- Máximo de 5 itens; prefira qualidade a quantidade
- due_date: interprete datas relativas (ex: "até sexta", "próxima semana") usando ${today} como referência; use null se não houver prazo mencionado
- "description": 1-2 frases de CONTEXTO da tarefa (o porquê, o que motivou, dado/decisão relevante da reunião). Terceira pessoa, fiel ao que foi dito — NÃO invente. Se não houver contexto além do título, repita objetivamente o pedido.

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
1. Escreva um resumo FIEL e CONCISO do que foi INFORMADO na entrada. NÃO invente, NÃO expanda, NÃO adicione contexto que não foi fornecido.
2. Capture com precisão TODOS os dados importantes que estão na entrada: objetivos, tópicos discutidos, decisões, riscos, próximos passos, datas, nomes, números. Se a entrada for curta, o resumo também será curto — isso é correto.
3. Se a entrada for uma transcrição longa ou texto detalhado, preserve todos os pontos relevantes sem perder informação. Se for uma frase curta, resuma somente o que foi dito.
4. Tom profissional e executivo. Terceira pessoa. Sem "eu fiz" ou similares.
5. ATENÇÃO MÁXIMA: Escreva todo o JSON sem quebras de linha reais físicas (Enter/fim de linha no arquivo). Use a sequência de escape literal "\\n" (barra invertida e n) para quebra de linha. NUNCA insira quebras de linha físicas dentro de strings no JSON para evitar crash na deserialização do JSON.

Instruções para os outros campos:
- account_name_hint: nome da empresa/conta se mencionado, senão null
- date: use ${today} se nenhuma data for mencionada; interprete "ontem", "segunda", etc. relativos à data de hoje`

  const { result: raw } = await generateText(prompt, {
    systemInstruction: await buildSystemInstruction('time_entry_parse'),
    allowFallback: true,
    disableThinking: true,
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
    if (!Array.isArray(parsed.action_items)) parsed.action_items = []

    return parsed
  } catch (err) {
    console.error('[Gemini] Erro ao parsear JSON:', json)
    throw new Error('IA retornou formato inválido')
  }
}
