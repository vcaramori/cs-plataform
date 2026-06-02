export type LLMProvider = 'gemini' | 'claude' | 'openai' | 'groq' | 'openrouter'

export interface TextGenerationConfig {
  systemInstruction?: string
  temperature?: number
  maxOutputTokens?: number
  responseMimeType?: string
  disableThinking?: boolean
}

export interface EmbeddingConfig {
  dimensions?: number
}

export interface ModelOption {
  id: string
  label: string
}

export interface LLMProviderAdapter {
  generateText(prompt: string, apiKey: string, model: string, config: TextGenerationConfig): Promise<string>
  generateEmbedding?(text: string, apiKey: string, model: string, config: EmbeddingConfig): Promise<number[]>
  readonly supportsEmbeddings: boolean
  readonly availableTextModels: ModelOption[]
  readonly availableEmbeddingModels: ModelOption[]
  readonly defaultTextModel: string
  readonly defaultEmbeddingModel: string | null
  readonly defaultEmbeddingDimensions: number | null
}
