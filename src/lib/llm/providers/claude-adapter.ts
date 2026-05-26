import Anthropic from '@anthropic-ai/sdk'
import type { LLMProviderAdapter, TextGenerationConfig, ModelOption } from './types'

let cachedClient: { key: string; client: Anthropic } | null = null

function getClient(apiKey: string): Anthropic {
  if (cachedClient && cachedClient.key === apiKey) return cachedClient.client
  const client = new Anthropic({ apiKey })
  cachedClient = { key: apiKey, client }
  return client
}

export const claudeAdapter: LLMProviderAdapter = {
  supportsEmbeddings: false,
  defaultTextModel: 'claude-haiku-4-5-20251001',
  defaultEmbeddingModel: null,
  defaultEmbeddingDimensions: null,

  availableTextModels: [
    { id: 'claude-haiku-4-5-20251001', label: 'Claude Haiku 4.5 (Rápido, econômico)' },
    { id: 'claude-sonnet-4-6', label: 'Claude Sonnet 4.6 (Balanceado)' },
    { id: 'claude-opus-4-7', label: 'Claude Opus 4.7 (Máxima capacidade)' },
  ],

  availableEmbeddingModels: [],

  async generateText(prompt: string, apiKey: string, model: string, config: TextGenerationConfig): Promise<string> {
    const client = getClient(apiKey)

    const messages: Anthropic.MessageParam[] = [{ role: 'user', content: prompt }]

    const response = await client.messages.create({
      model,
      max_tokens: config.maxOutputTokens ?? 2048,
      ...(config.temperature != null && { temperature: config.temperature }),
      ...(config.systemInstruction && { system: config.systemInstruction }),
      messages,
    })

    const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
    if (!textBlock) throw new Error('[Claude] Response has no text block')
    return textBlock.text.trim()
  },
}
