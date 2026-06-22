/**
 * Parser robusto para JSON vindo de LLM. Modelos às vezes devolvem JSON com cercas
 * (```json), prosa em volta, barras invertidas inválidas (\ antes de char não-escape,
 * ex.: caminhos do Windows) ou caracteres de controle ilegais — o que quebra JSON.parse
 * com "Bad escaped character" / "Bad control character". Este helper extrai o bloco JSON
 * e tenta sanitizar antes de desistir. Retorna null se nada parsear.
 */
export function safeParseLLMJson<T = unknown>(raw: string | null | undefined): T | null {
  if (!raw) return null

  // Remove cercas de código e prosa: pega o primeiro bloco {...} ou [...].
  let s = raw.trim()
  const fenced = s.match(/```(?:json)?\s*([\s\S]*?)```/i)
  if (fenced) s = fenced[1].trim()
  const block = s.match(/[{[][\s\S]*[}\]]/)
  if (block) s = block[0]

  for (const candidate of [s, sanitize(s)]) {
    try {
      return JSON.parse(candidate) as T
    } catch {
      /* tenta o próximo */
    }
  }
  return null
}

/** Conserta os defeitos mais comuns de JSON de LLM, sem tocar em espaços estruturais. */
function sanitize(s: string): string {
  // Remove caracteres de controle ilegais (mantém TAB=9, LF=10, CR=13 estruturais).
  let cleaned = ''
  for (let i = 0; i < s.length; i++) {
    const code = s.charCodeAt(i)
    if (code < 0x20 && code !== 9 && code !== 10 && code !== 13) continue
    cleaned += s[i]
  }
  // Barra invertida inválida (não seguida de escape JSON válido) → escapada.
  // Conserta "Bad escaped character" sem alterar o conteúdo textual.
  return cleaned.replace(/\\(?!["\\/bfnrtu])/g, '\\\\')
}
