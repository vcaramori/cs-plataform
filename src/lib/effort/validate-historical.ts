import type { HistoricalEntry } from '@/lib/gemini/parse-historical-efforts'

/**
 * Validação da carga histórica ANTES do commit. Roda no preview e devolve avisos
 * para o usuário revisar — sem gravar nada. Avisos de nível "error" marcam entradas
 * que NÃO devem subir (a UI as desmarca por padrão); "warning" é informativo.
 */

export type HistoricalWarningCode = 'truncated' | 'invalid_date' | 'future_date' | 'duplicate'

export type HistoricalWarning = {
  level: 'error' | 'warning'
  code: HistoricalWarningCode
  message: string
  /** índices das entradas afetadas; [] = aviso do lote inteiro (ex.: truncamento) */
  entryIndexes: number[]
}

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/

function normalizeContent(s: string): string {
  return (s || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 150)
}

export function validateHistoricalEntries(
  entries: HistoricalEntry[],
  opts: { today: string; truncated: boolean }
): HistoricalWarning[] {
  const warnings: HistoricalWarning[] = []

  if (opts.truncated) {
    warnings.push({
      level: 'warning',
      code: 'truncated',
      message: `A resposta da IA veio truncada — ${entries.length} reunião(ões) recuperada(s), mas pode faltar alguma. Importe estas e cole o restante do texto em uma nova carga.`,
      entryIndexes: [],
    })
  }

  // Datas inválidas e futuras
  const invalid: number[] = []
  const future: number[] = []
  entries.forEach((e, i) => {
    if (!ISO_DATE.test(e.date) || Number.isNaN(Date.parse(e.date))) {
      invalid.push(i)
    } else if (e.date > opts.today) {
      future.push(i)
    }
  })
  if (invalid.length) {
    warnings.push({
      level: 'error',
      code: 'invalid_date',
      message: `${invalid.length} reunião(ões) com data inválida — não serão importadas. Revise o texto colado.`,
      entryIndexes: invalid,
    })
  }
  if (future.length) {
    warnings.push({
      level: 'warning',
      code: 'future_date',
      message: `${future.length} reunião(ões) com data no futuro — incomum em carga histórica. Confira se a IA interpretou a data certa antes de subir.`,
      entryIndexes: future,
    })
  }

  // Duplicatas por conteúdo (mesmo trecho repetido, mesmo em datas diferentes — a IA
  // pode ter assinado datas distintas para um bloco colado duas vezes). Mantém a 1ª
  // ocorrência e marca as demais.
  const byContent = new Map<string, number[]>()
  entries.forEach((e, i) => {
    const key = normalizeContent(e.raw_text || e.parsed_description)
    if (key.length < 20) return // trecho curto demais para comparar com segurança
    const arr = byContent.get(key) ?? []
    arr.push(i)
    byContent.set(key, arr)
  })
  const dupIdx: number[] = []
  for (const idxs of byContent.values()) {
    if (idxs.length > 1) dupIdx.push(...idxs.slice(1))
  }
  if (dupIdx.length) {
    warnings.push({
      level: 'warning',
      code: 'duplicate',
      message: `${dupIdx.length} reunião(ões) parecem duplicadas (mesmo conteúdo) — desmarque as repetidas para não lançar esforço em duplicidade.`,
      entryIndexes: dupIdx,
    })
  }

  return warnings
}
