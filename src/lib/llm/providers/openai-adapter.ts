import OpenAI from 'openai'
import type { LLMProviderAdapter, TextGenerationConfig, EmbeddingConfig, ModelOption } from './types'

let cachedClient: { key: string; client: OpenAI } | null = null

function getClient(apiKey: string): OpenAI {
  if (cachedClient && cachedClient.key === apiKey) return cachedClient.client
  const client = new OpenAI({ apiKey })
  cachedClient = { key: apiKey, client }
  return client
}

export const openaiAdapter: LLMProviderAdapter = {
  supportsEmbeddings: true,
  defaultTextModel: 'gpt-4o-mini',
  defaultEmbeddingModel: 'text-embedding-3-small',
  defaultEmbeddingDimensions: 1536,

  availableTextModels: [
    { id: 'gpt-4o', label: 'GPT-4o (Avançado)' },
    { id: 'gpt-4o-mini', label: 'GPT-4o Mini (Rápido, econômico)' },
    { id: 'gpt-4.1-mini', label: 'GPT-4.1 Mini (Novo)' },
    { id: 'o3-mini', label: 'o3-mini (Raciocínio)' },
  ],

  availableEmbeddingModels: [
    { id: 'text-embedding-3-small', label: 'text-embedding-3-small (1536d)' },
    { id: 'text-embedding-3-large', label: 'text-embedding-3-large (3072d)' },
  ],

  async generateText(prompt: string, apiKey: string, model: string, config: TextGenerationConfig): Promise<string> {
    const client = getClient(apiKey)

    const messages: OpenAI.ChatCompletionMessageParam[] = []
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

  async generateEmbedding(text: string, apiKey: string, model: string, config: EmbeddingConfig): Promise<number[]> {
    const client = getClient(apiKey)

    const response = await client.embeddings.create({
      model,
      input: text,
      ...(config.dimensions && { dimensions: config.dimensions }),
    })

    return response.data[0]?.embedding ?? []
  },
}
