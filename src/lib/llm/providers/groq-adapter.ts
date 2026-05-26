import Groq from 'groq-sdk'
import type { LLMProviderAdapter, TextGenerationConfig } from './types'

let cachedClient: { key: string; client: Groq } | null = null

function getClient(apiKey: string): Groq {
  if (cachedClient && cachedClient.key === apiKey) return cachedClient.client
  const client = new Groq({ apiKey })
  cachedClient = { key: apiKey, client }
  return client
}

export const groqAdapter: LLMProviderAdapter = {
  supportsEmbeddings: false,
  defaultTextModel: 'llama-3.3-70b-versatile',
  defaultEmbeddingModel: null,
  defaultEmbeddingDimensions: null,

  availableTextModels: [
    { id: 'llama-3.3-70b-versatile', label: 'Llama 3.3 70B (Versátil)' },
    { id: 'llama-3.1-8b-instant', label: 'Llama 3.1 8B (Ultra-rápido)' },
    { id: 'mixtral-8x7b-32768', label: 'Mixtral 8x7B (32K contexto)' },
    { id: 'gemma2-9b-it', label: 'Gemma 2 9B (Google)' },
  ],

  availableEmbeddingModels: [],

  async generateText(prompt: string, apiKey: string, model: string, config: TextGenerationConfig): Promise<string> {
    const client = getClient(apiKey)

    const messages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = []
    if (config.systemInstruction) {
      messages.push({ role: 'system', content: config.systemInstruction })
    }
    messages.push({ role: 'user', content: prompt })

    const response = await client.chat.completions.create({
      model,
      messages,
      temperature: config.temperature ?? 0,
      max_tokens: config.maxOutputTokens ?? 2048,
      ...(config.responseMimeType === 'application/json' && { response_format: { type: 'json_object' } }),
    })

    return response.choices[0]?.message?.content ?? ''
  },
}
