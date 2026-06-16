import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'
import type { ActivityType } from '@/lib/supabase/types'

export type HistoricalActionItem = {
  title: string
  due_date: string | null // YYYY-MM-DD ou null
  description?: string | null // contexto/porquê da tarefa
}

export type HistoricalEntry = {
  date: string                 // YYYY-MM-DD (data real da reunião)
  raw_text: string             // trecho original daquela reunião (fiel)
  parsed_description: string   // resumo executivo do trecho
  activity_type: ActivityType
  parsed_hours: number
  account_name_hint: string | null
  action_items: HistoricalActionItem[]
  skip_tasks: boolean          // true se o texto pedir para NÃO registrar atividades
}

export type HistoricalParseResult = {
  entries: HistoricalEntry[]
  /** true quando a resposta da IA veio truncada e só recuperamos parte das reuniões */
  truncated: boolean
}

/**
 * Recupera entradas de um JSON possivelmente truncado (resposta da IA cortada pelo
 * teto de saída). Varre o array `entries` objeto a objeto, com controle de strings
 * e profundidade de chaves, e devolve apenas os objetos COMPLETOS — a última reunião
 * cortada é descartada em silêncio.
 */
function salvageEntries(raw: string): HistoricalEntry[] {
  const keyIdx = raw.indexOf('"entries"')
  const startIdx = raw.indexOf('[', keyIdx === -1 ? 0 : keyIdx)
  if (startIdx === -1) return []

  const objects: HistoricalEntry[] = []
  let depth = 0
  let objStart = -1
  let inStr = false
  let esc = false

  for (let i = startIdx + 1; i < raw.length; i++) {
    const c = raw[i]
    if (inStr) {
      if (esc) esc = false
      else if (c === '\\') esc = true
      else if (c === '"') inStr = false
      continue
    }
    if (c === '"') { inStr = true; continue }
    if (c === '{') { if (depth === 0) objStart = i; depth++ }
    else if (c === '}') {
      depth--
      if (depth === 0 && objStart !== -1) {
        try { objects.push(JSON.parse(raw.slice(objStart, i + 1)) as HistoricalEntry) } catch { /* objeto incompleto */ }
        objStart = -1
      }
    } else if (c === ']' && depth === 0) {
      break
    }
  }
  return objects
}

/**
 * Carga histórica: recebe UM bloco contendo VÁRIAS reuniões/esforços (cada um com
 * sua data) e separa em entradas individuais por data. Cada entrada preserva o
 * trecho original (para o RAG) + resumo + ações. `skip_tasks=true` quando o texto
 * daquela reunião pedir explicitamente para não registrar atividades/tarefas.
 */
export async function parseHistoricalEfforts(rawText: string, today: string): Promise<HistoricalParseResult> {
  const prompt = `Você é um assistente de Customer Success. O texto abaixo é uma CARGA HISTÓRICA contendo VÁRIAS reuniões/esforços com um cliente, cada um geralmente com sua própria DATA. Separe o texto em ENTRADAS INDIVIDUAIS — uma por reunião/data.

Texto:
"""
${rawText}
"""
Data de hoje (referência para datas relativas): ${today}

Retorne APENAS um JSON válido:
{
  "entries": [
    {
      "date": "<YYYY-MM-DD>",
      "raw_text": "<trecho ORIGINAL e FIEL daquela reunião, sem inventar>",
      "parsed_description": "<resumo executivo e fiel do trecho>",
      "activity_type": "<tipo>",
      "parsed_hours": <número decimal>,
      "account_name_hint": "<nome da conta se mencionado, senão null>",
      "action_items": [ { "title": "<ação concreta>", "due_date": "<YYYY-MM-DD ou null>", "description": "<contexto curto da tarefa>" } ],
      "skip_tasks": <true|false>
    }
  ]
}

Regras OBRIGATÓRIAS:
- Crie UMA entrada por reunião/data identificável. Se houver várias datas, gere várias entradas. Se for uma única reunião, gere uma só.
- "date": use a data informada para aquela reunião; interprete datas relativas com base em ${today}. Se uma reunião não tiver data explícita, use a data mais provável pelo contexto ou ${today}.
- "raw_text": copie FIELMENTE o trecho daquela reunião (não invente, não resuma aqui). É o que será indexado no RAG.
- "parsed_description": resumo executivo, terceira pessoa, fiel ao trecho. Sem quebras de linha físicas — use "\\n" literal se precisar.
- "skip_tasks": defina TRUE se o texto daquela reunião indicar que NÃO se deve registrar atividades/tarefas/follow-ups (ex.: "não gerar tarefas", "não registrar atividades", "apenas histórico"). Caso contrário FALSE.
- "action_items": só ações concretas mencionadas; máximo 5 por reunião; due_date relativa a ${today}; [] se não houver. Se skip_tasks=true, retorne []. "description" = 1-2 frases de contexto da tarefa (porquê/dado relevante da reunião), 3ª pessoa, fiel — não invente.
- parsed_hours: converta tempo ("1h30"→1.5, "30min"→0.5); se não houver menção, use 1.0.

Tipos válidos para activity_type:
- "preparation", "environment-analysis", "strategy", "reporting", "internal-meeting", "meeting", "onboarding", "qbr", "other"
- "meeting" = reunião COM o cliente; "internal-meeting" = interna; "onboarding" = kickoff/implantação/treinamento; "qbr" = review trimestral.

ATENÇÃO: escreva o JSON sem quebras de linha físicas dentro de strings (use "\\n"). Retorne SOMENTE o JSON.`

  const { result: raw } = await generateText(prompt, {
    systemInstruction: await buildSystemInstruction('time_entry_parse'),
    allowFallback: true,
    disableThinking: true,
    responseMimeType: 'application/json',
    // A carga histórica precisa ecoar o `raw_text` FIEL de cada reunião — a saída
    // é, no mínimo, do tamanho do texto colado. O teto padrão (2048) trunca o JSON
    // em textos grandes e quebra o parse. Damos folga generosa aqui.
    maxOutputTokens: 32768,
  })

  const jsonMatch = raw.match(/\{[\s\S]*\}/)
  const json = jsonMatch ? jsonMatch[0] : raw

  let entries: HistoricalEntry[]
  let truncated = false
  try {
    const parsed = JSON.parse(json) as { entries?: HistoricalEntry[] }
    entries = Array.isArray(parsed.entries) ? parsed.entries : []
  } catch {
    // Resposta provavelmente truncada (texto longo demais para o teto de saída).
    // Tenta recuperar as reuniões completas e descarta apenas a última cortada.
    entries = salvageEntries(raw)
    truncated = true
    if (entries.length === 0) {
      console.error('[Historical] JSON inválido:', raw.slice(0, 800))
      throw new Error('IA retornou formato inválido para a carga histórica. O texto pode estar longo demais — cole menos reuniões por vez e tente novamente.')
    }
    console.warn(`[Historical] Resposta truncada; recuperadas ${entries.length} reunião(ões) completa(s).`)
  }

  const normalized = entries.map((e) => ({
    date: e.date || today,
    raw_text: (e.raw_text || '').trim() || (e.parsed_description || ''),
    parsed_description: e.parsed_description || '',
    activity_type: (e.activity_type || 'meeting') as ActivityType,
    parsed_hours: typeof e.parsed_hours === 'number' && e.parsed_hours > 0 ? e.parsed_hours : 1.0,
    account_name_hint: e.account_name_hint ?? null,
    action_items: Array.isArray(e.action_items) ? e.action_items.slice(0, 5) : [],
    skip_tasks: e.skip_tasks === true,
  }))

  return { entries: normalized, truncated }
}
