import OpenAI from 'openai'
import type { LLMProviderAdapter, TextGenerationConfig, EmbeddingConfig, ModelOption } from './types'

let cachedClient: { key: string; client: OpenAI } | null = null

function getClient(apiKey: string): OpenAI {
  if (cachedClient && cachedClient.key === apiKey) return cachedClient.client
  const client = new OpenAI({ 
    apiKey,
    baseURL: 'https://integrate.api.nvidia.com/v1',
  })
  cachedClient = { key: apiKey, client }
  return client
}

export const nvidiaAdapter: LLMProviderAdapter = {
  supportsEmbeddings: true,
  defaultTextModel: 'moonshotai/kimi-k2.6',
  defaultEmbeddingModel: 'nvidia/nv-embedqa-e5-v5',
  defaultEmbeddingDimensions: 1024, // E5 usually defaults to 1024 or 768, let's keep it consistent

  availableTextModels: [
    { id: 'moonshotai/kimi-k2.6', label: 'Kimi 2.6' },
    { id: 'meta/llama-3.1-70b-instruct', label: 'Llama 3.1 70B Instruct' },
    { id: 'meta/llama-3.1-8b-instruct', label: 'Llama 3.1 8B Instruct' },
  ],

  availableEmbeddingModels: [
    { id: 'nvidia/nv-embedqa-e5-v5', label: 'Nvidia NV-EmbedQA E5 v5' },
    { id: 'snowflake/arctic-embed-l', label: 'Snowflake Arctic Embed L' },
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
      encoding_format: 'float',
      ...(config.dimensions && { dimensions: config.dimensions })
    })

    if (!response.data[0]?.embedding) {
      throw new Error(`[NVIDIA Adapter] Failed to generate embedding for text: ${text.substring(0, 50)}...`)
    }

    return response.data[0].embedding
  }
}
