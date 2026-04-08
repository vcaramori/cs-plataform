/**
 * Cliente Ollama — API REST local
 * Documentação: https://github.com/ollama/ollama/blob/main/docs/api.md
 */

export interface OllamaGenerateOptions {
  model?: string
  temperature?: number
  stream?: boolean
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
  const model = options.model || process.env.OLLAMA_MODEL || 'qwen2.5:7b'

  const response = await fetch(`${baseUrl}/api/generate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      model,
      prompt,
      stream: false,
      options: {
        temperature: options.temperature ?? 0.1,
        num_predict: 2048,
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
