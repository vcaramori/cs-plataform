import OpenAI from 'openai'
import type { LLMProviderAdapter, TextGenerationConfig, ModelOption } from './types'

let cachedClient: { key: string; client: OpenAI } | null = null

function getClient(apiKey: string): OpenAI {
  if (cachedClient && cachedClient.key === apiKey) return cachedClient.client
  const client = new OpenAI({ 
    apiKey,
    baseURL: 'https://openrouter.ai/api/v1',
    defaultHeaders: {
      'HTTP-Referer': 'https://plannera.com.br',
      'X-Title': 'CS Platform',
    }
  })
  cachedClient = { key: apiKey, client }
  return client
}

export const openrouterAdapter: LLMProviderAdapter = {
  supportsEmbeddings: false,
  defaultTextModel: 'openrouter/auto',
  defaultEmbeddingModel: null,
  defaultEmbeddingDimensions: null,

  availableTextModels: [
    { id: 'google/gemini-2.5-flash:free', label: 'Gemini 2.5 Flash (Free)' },
    { id: 'meta-llama/llama-3.1-8b-instruct:free', label: 'Llama 3.1 8B Instruct (Free)' },
    { id: 'moonshotai/kimi-k2.6:free', label: 'Kimi 2.6 (Free)' },
    { id: 'qwen/qwen-2.5-72b-instruct:free', label: 'Qwen 2.5 72B Instruct (Free)' },
    { id: 'deepseek/deepseek-chat:free', label: 'DeepSeek Chat (Free)' },
    { id: 'nvidia/nemotron-3-nano-30b-a3b:free', label: 'Nemotron Nano 30B (Free)' },
    { id: 'openrouter/auto', label: 'OpenRouter Auto (Best Free/Cheap)' },
  ],

  availableEmbeddingModels: [],

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
}
