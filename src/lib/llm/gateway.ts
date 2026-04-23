/**
 * LLM Gateway — Abstração de Provider com Foco em Gemini
 * 
 * Migrado para o novo SDK @google/genai (v1.0.0+) conforme documentação oficial.
 * Neste estágio de teste, apenas o Gemini está ativo.
 */

import { GoogleGenAI } from '@google/genai'
import { env } from '@/lib/env'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type LLMProvider = 'gemini' | 'gemini-fallback' | 'claude-fallback' | 'ollama'

export interface GenerateOptions {
  /**
   * Instrução de sistema separada do conteúdo do usuário.
   * O gateway mapeia para o canal correto de cada provedor:
   *   Gemini  → config.systemInstruction
   *   Claude  → parâmetro top-level `system`
   *   Ollama  → messages[0] com role: 'system'
   */
  systemInstruction?: string
  /** Permite fallback (desativado temporariamente por regra de teste) */
  allowFallback?: boolean
  /** Timeout em ms. */
  timeoutMs?: number
  /** Temperatura do modelo. Default: 0 */
  temperature?: number
  /** Força um modelo específico do Gemini. */
  model?: string
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

// ─── Cliente Gemini (Novo SDK) ──────────────────────────────────────────────

// O SDK @google/genai busca GEMINI_API_KEY automaticamente do process.env
const ai = new GoogleGenAI({ apiKey: env.gemini.apiKey })

/**
 * Helper interno para geração via Gemini usando o novo SDK
 */
async function geminiGenerate(
  prompt: string,
  modelId: string,
  systemInstruction?: string
): Promise<string> {
  try {
    const response = await ai.models.generateContent({
      model: modelId,
      ...(systemInstruction && {
        systemInstruction: { parts: [{ text: systemInstruction }] },
      }),
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
      config: { temperature: 0 },
    })
    return response.text ?? ''
  } catch (err: any) {
    if (err.message?.includes('503') || err.message?.includes('overloaded')) {
      throw new Error(`[Gemini] Modelo ${modelId} sobrecarregado.`)
    }
    throw err
  }
}

/*
 * Mapeamento de systemInstruction por provedor (stubs para ativação futura):
 *
 * Claude (Anthropic SDK):
 *   client.messages.create({ system: systemInstruction, messages: [{ role: 'user', content: prompt }] })
 *
 * Ollama:
 *   messages: [
 *     ...(systemInstruction ? [{ role: 'system', content: systemInstruction }] : []),
 *     { role: 'user', content: prompt },
 *   ]
 */

// ─── Gateway: Geração de Texto ───────────────────────────────────────────────

/**
 * Gera texto usando Gemini como único provider (Configuração de Teste).
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<LLMResponse<string>> {
  const start = Date.now()
  
  // No modo "apenas gemini", ignoramos o config.provider do env se for Ollama
  // Mas respeitamos a escolha do modelo (Pro ou Flash)
  const modelId = options.model ?? (prompt.length > 2000 ? env.gemini.proModel : env.gemini.flashModel)

  try {
    const text = await geminiGenerate(prompt, modelId, options.systemInstruction)
    return { 
      result: text, 
      provider: 'gemini', 
      durationMs: Date.now() - start 
    }
  } catch (err: any) {
    console.error(`[LLM Gateway] Erro crítico no Gemini: ${err.message}`)
    throw err
  }
}

// ─── Gateway: Embeddings ─────────────────────────────────────────────────────

/**
 * Gera embeddings usando o Gemini.
 */
export async function generateEmbedding(
  text: string,
  options: EmbedOptions = {}
): Promise<LLMResponse<number[]>> {
  const start = Date.now()

  try {
    const response = await ai.models.embedContent({
      model: env.gemini.embeddingModel || 'text-embedding-004',
      contents: [{ parts: [{ text }] }],
      config: {
        taskType: 'RETRIEVAL_DOCUMENT',
        outputDimensionality: 768, // Mantendo 768 para compatibilidade com pgvector
      }
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
