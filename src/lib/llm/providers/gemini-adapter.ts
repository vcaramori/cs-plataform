import { GoogleGenAI } from '@google/genai'
import type { LLMProviderAdapter, TextGenerationConfig, EmbeddingConfig, ModelOption } from './types'

let cachedClient: { key: string; client: GoogleGenAI } | null = null

function getClient(apiKey: string): GoogleGenAI {
  if (cachedClient && cachedClient.key === apiKey) return cachedClient.client
  const client = new GoogleGenAI({ apiKey })
  cachedClient = { key: apiKey, client }
  return client
}

export const geminiAdapter: LLMProviderAdapter = {
  supportsEmbeddings: true,
  defaultTextModel: 'gemini-2.5-flash',
  defaultEmbeddingModel: 'gemini-embedding-001',
  defaultEmbeddingDimensions: 1536,

  availableTextModels: [
    { id: 'gemini-2.5-flash', label: 'Gemini 2.5 Flash (Rápido)' },
    { id: 'gemini-2.5-pro', label: 'Gemini 2.5 Pro (Avançado)' },
    { id: 'gemini-2.0-flash', label: 'Gemini 2.0 Flash (Legado)' },
  ],

  availableEmbeddingModels: [
    { id: 'gemini-embedding-001', label: 'gemini-embedding-001 (1536d)' },
  ],

  async generateText(prompt: string, apiKey: string, model: string, config: TextGenerationConfig): Promise<string> {
    const ai = getClient(apiKey)
    const response = await ai.models.generateContent({
      model,
      contents: prompt,
      config: {
        systemInstruction: config.systemInstruction,
        temperature: config.temperature ?? 0,
        maxOutputTokens: config.maxOutputTokens ?? 2048,
        responseMimeType: config.responseMimeType,
        ...(config.disableThinking && { thinkingConfig: { thinkingBudget: 0 } }),
      },
    })
    return response.text ?? ''
  },

  async generateEmbedding(text: string, apiKey: string, model: string, config: EmbeddingConfig): Promise<number[]> {
    const ai = getClient(apiKey)
    const response = await ai.models.embedContent({
      model,
      contents: text,
      config: { outputDimensionality: config.dimensions ?? 1536 },
    })
    return response.embeddings?.[0]?.values ?? []
  },
}
