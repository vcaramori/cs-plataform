/**
 * Cliente Ollama — API REST local
 * Documentação: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

export interface OllamaGenerateOptions {
  model?: string
  temperature?: number
  stream?: boolean
  /** Máximo de tokens a gerar. Default: 512 (adequado para CPU; aumente se precisar de respostas longas) */
  maxTokens?: number
}

export interface OllamaEmbedOptions {
  model?: string
}

/**
 * Gera texto via Ollama (POST /api/generate)
 * Usa o modelo configurado em OLLAMA_MODEL
 */
export async function ollamaGenerate(
  prompt: string,
  options: OllamaGenerateOptions = {}
): Promise<string> {
  const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
  const model = options.model || process.env.OLLAMA_MODEL || 'qwen2.5:1.5b'
  // Em CPU, cada token custa ~50-100ms. 512 tokens ≈ 25-50s — seguro dentro do timeout de 60s.
  // Aumente via OLLAMA_NUM_PREDICT se precisar de respostas mais longas (e ajuste LLM_TIMEOUT_MS).
  const numPredict = options.maxTokens ?? parseInt(process.env.OLLAMA_NUM_PREDICT || '512')

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0,
        num_predict: numPredict,
        repeat_penalty: 1.2,
      },
    }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Ollama error ${response.status}: ${body}`)
  }

  const data = await response.json() as { response: string }
  return data.response.trim()
}

/**
 * Gera embeddings via Ollama (POST /api/embeddings)
 * Usa o modelo configurado em OLLAMA_EMBEDDING_MODEL
 */
export async function ollamaEmbed(
  text: string,
  options: OllamaEmbedOptions = {}
): Promise<number[]> {
  const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
  const model = options.model || process.env.OLLAMA_EMBEDDING_MODEL || 'nomic-embed-text'

  const response = await fetch(`${baseUrl}/api/embeddings`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ model, prompt: text }),
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Ollama embed error ${response.status}: ${body}`)
  }

  const data = await response.json() as { embedding: number[] }
  return data.embedding
}

/**
 * Verifica se o Ollama está disponível e responsivo
 */
export async function ollamaHealthCheck(): Promise<boolean> {
  const baseUrl = process.env.OLLAMA_URL || 'http://localhost:11434'
  try {
    const res = await fetch(`${baseUrl}/api/tags`, { method: 'GET' })
    return res.ok
  } catch {
    return false
  }
}
