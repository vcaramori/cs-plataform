import { getAdapter } from './providers'
import { getLLMSettings } from './settings'
import type { LLMProvider } from './providers/types'

// ─── Tipos (mantidos para backward compatibility) ──────────────────────────

export type { LLMProvider } from './providers/types'

export interface GenerateOptions {
  systemInstruction?: string
  allowFallback?: boolean
  timeoutMs?: number
  temperature?: number
  model?: string
  maxOutputTokens?: number
  disableThinking?: boolean
  responseMimeType?: string
  /** Force a specific provider, overriding the configured default */
  provider?: LLMProvider
}

export interface EmbedOptions {
  allowFallback?: boolean
  timeoutMs?: number
  /** Force a specific provider for embeddings */
  provider?: LLMProvider
}

export interface LLMResponse<T> {
  result: T
  provider: LLMProvider
  durationMs: number
}

// ─── Gateway: Geração de Texto ───────────────────────────────────────────────

export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<LLMResponse<string>> {
  const start = Date.now()
  const settings = await getLLMSettings()

  const provider = options.provider ?? settings.textProvider
  const model = options.model ?? settings.textModel
  const apiKey = settings.apiKeys[provider]

  if (!apiKey) {
    throw new Error(`[LLM Gateway] No API key configured for provider: ${provider}`)
  }

  const adapter = getAdapter(provider)

  try {
    const result = await adapter.generateText(prompt, apiKey, model, {
      systemInstruction: options.systemInstruction,
      temperature: options.temperature ?? settings.temperature,
      maxOutputTokens: options.maxOutputTokens ?? settings.maxTokens,
      responseMimeType: options.responseMimeType,
      disableThinking: options.disableThinking,
    })

    return { result, provider, durationMs: Date.now() - start }
  } catch (err: any) {
    if (options.allowFallback !== false && provider !== 'gemini') {
      const fallbackKey = settings.apiKeys.gemini
      if (fallbackKey) {
        try {
          const fallbackAdapter = getAdapter('gemini')
          const result = await fallbackAdapter.generateText(prompt, fallbackKey, settings.textModel, {
            systemInstruction: options.systemInstruction,
            temperature: options.temperature ?? settings.temperature,
            maxOutputTokens: options.maxOutputTokens ?? settings.maxTokens,
            responseMimeType: options.responseMimeType,
            disableThinking: options.disableThinking,
          })
          return { result, provider: 'gemini', durationMs: Date.now() - start }
        } catch {
          // Fallback also failed, throw original error
        }
      }
    }

    console.error(`[LLM Gateway] Error from ${provider}: ${err.message}`)
    throw err
  }
}

// ─── Gateway: Embeddings ─────────────────────────────────────────────────────

export async function generateEmbedding(
  text: string,
  options: EmbedOptions = {}
): Promise<LLMResponse<number[]>> {
  const start = Date.now()
  const settings = await getLLMSettings()

  const provider = options.provider ?? settings.embeddingProvider
  const apiKey = settings.apiKeys[provider]

  if (!apiKey) {
    throw new Error(`[LLM Gateway] No API key configured for embedding provider: ${provider}`)
  }

  const adapter = getAdapter(provider)

  if (!adapter.supportsEmbeddings || !adapter.generateEmbedding) {
    throw new Error(`[LLM Gateway] Provider ${provider} does not support embeddings`)
  }

  try {
    const result = await adapter.generateEmbedding(text, apiKey, settings.embeddingModel, {
      dimensions: settings.embeddingDimensions,
    })

    return { result, provider, durationMs: Date.now() - start }
  } catch (err: any) {
    console.error(`[LLM Gateway] Embedding error from ${provider}: ${err.message}`)
    throw err
  }
}
