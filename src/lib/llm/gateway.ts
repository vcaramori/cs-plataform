import { GoogleGenAI } from '@google/genai'
import { env } from '@/lib/env'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type LLMProvider = 'gemini' | 'gemini-fallback' | 'claude-fallback' | 'ollama'

export interface GenerateOptions {
  systemInstruction?: string
  allowFallback?: boolean
  timeoutMs?: number
  temperature?: number
  /** Força um modelo específico do Gemini. */
  model?: string
  /** Limite de tokens na saída. Default: 2048. */
  maxOutputTokens?: number
  /** Desativa o thinking do Gemini 2.5 (thinkingBudget: 0). Recomendado para respostas JSON estruturadas. */
  disableThinking?: boolean
}

export interface EmbedOptions {
  allowFallback?: boolean
  timeoutMs?: number
}

export interface LLMResponse<T> {
  result: T
  provider: LLMProvider
  durationMs: number
}

// ─── Cliente Gemini (SDK Oficial @google/genai) ──────────────────────────────

const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey })

// ─── Gateway: Geração de Texto ───────────────────────────────────────────────

export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<LLMResponse<string>> {
  const start = Date.now()

  const modelId = options.model ?? (prompt.length > 2000 ? env.gemini.proModel : env.gemini.flashModel)

  try {
    const response = await ai.models.generateContent({
      model: modelId,
      contents: prompt,
      config: {
        systemInstruction: options.systemInstruction,
        temperature: options.temperature ?? 0,
        maxOutputTokens: options.maxOutputTokens ?? 2048,
        ...(options.disableThinking && {
          thinkingConfig: { thinkingBudget: 0 },
        }),
      },
    })

    return {
      result: response.text ?? '',
      provider: 'gemini',
      durationMs: Date.now() - start,
    }
  } catch (err: any) {
    if (err.message?.includes('503') || err.message?.includes('overloaded')) {
      throw new Error(`[Gemini] Modelo ${modelId} sobrecarregado.`)
    }
    console.error(`[LLM Gateway] Erro crítico no Gemini: ${err.message}`)
    throw err
  }
}

// ─── Gateway: Embeddings ─────────────────────────────────────────────────────

export async function generateEmbedding(
  text: string,
  options: EmbedOptions = {}
): Promise<LLMResponse<number[]>> {
  const start = Date.now()

  try {
    const response = await ai.models.embedContent({
      model: env.gemini.embeddingModel || 'text-embedding-004',
      contents: text,
    })

    const embedding = response.embeddings?.[0]?.values ?? []

    return {
      result: embedding,
      provider: 'gemini',
      durationMs: Date.now() - start,
    }
  } catch (err: any) {
    console.error(`[LLM Gateway] Erro no embedding Gemini: ${err.message}`)
    throw err
  }
}
