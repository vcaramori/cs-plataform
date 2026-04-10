/**
 * LLM Gateway — Abstração de Provider com Fallback
 * 
 * Fluxo:
 *   1. Tenta executar no Ollama (local, privado)
 *   2. Se timeout ou erro → fallback para Gemini (se allowFallback=true)
 *   3. Loga sempre qual provider foi usado
 * 
 * Configuração via .env:
 *   LLM_PROVIDER=ollama|gemini    (default: gemini)
 *   LLM_TIMEOUT_MS=15000          (timeout antes do fallback, default: 15s)
 *   LLM_ALLOW_FALLBACK=true|false (default: true)
 */

import { ollamaGenerate, ollamaEmbed } from './ollama'
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type LLMProvider = 'ollama' | 'gemini' | 'gemini-fallback'

export interface GenerateOptions {
  /** Permite fallback para Gemini se Ollama falhar. Default: true */
  allowFallback?: boolean
  /** Timeout em ms antes de acionar o fallback. Default: LLM_TIMEOUT_MS env */
  timeoutMs?: number
  /** Temperatura do modelo (0=determinístico, 1=criativo). Default: 0.1 */
  temperature?: number
}

export interface EmbedOptions {
  /** Permite fallback para Gemini se Ollama falhar. Default: true */
  allowFallback?: boolean
  /** Timeout em ms antes de acionar o fallback. Default: LLM_TIMEOUT_MS env */
  timeoutMs?: number
}

export interface LLMResponse<T> {
  result: T
  provider: LLMProvider
  durationMs: number
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

function getConfig() {
  return {
    provider: (process.env.LLM_PROVIDER || 'gemini') as 'ollama' | 'gemini',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS || '15000'),
    allowFallback: process.env.LLM_ALLOW_FALLBACK !== 'false',
  }
}

function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  return Promise.race([
    promise,
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error(`LLM Gateway timeout após ${ms}ms`)), ms)
    ),
  ])
}

function getGeminiFlash() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return genAI.getGenerativeModel(
    { model: process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash-latest' },
    { apiVersion: 'v1beta' }
  )
}

function getGeminiEmbedding() {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  return genAI.getGenerativeModel(
    { model: process.env.GEMINI_EMBEDDING_MODEL || 'text-embedding-004' },
    { apiVersion: 'v1beta' }
  )
}

// ─── Gateway: Geração de Texto ───────────────────────────────────────────────

/**
 * Helper interno para geração via Gemini com tentativa de fallback em caso de 503 (overload)
 */
async function geminiGenerate(prompt: string, primaryModel: string, fallbackModel?: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!)
  
  try {
    const model = genAI.getGenerativeModel({ model: primaryModel }, { apiVersion: 'v1beta' })
    const result = await model.generateContent(prompt)
    return result.response.text().trim()
  } catch (err: any) {
    const isOverload = err.message?.includes('503') || err.message?.includes('high demand')
    if (isOverload && fallbackModel && primaryModel !== fallbackModel) {
      console.log(`[LLM Gateway] ⚠️ Gemini ${primaryModel} sobrecarregado (503). Tentando fallback para ${fallbackModel}...`)
      try {
        const modelFallback = genAI.getGenerativeModel({ model: fallbackModel }, { apiVersion: 'v1beta' })
        const resFallback = await modelFallback.generateContent(prompt)
        return resFallback.response.text().trim()
      } catch (fallbackErr) {
        throw fallbackErr
      }
    }
    throw err
  }
}

/**
 * Gera texto usando o provider configurado, com fallback automático.
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<LLMResponse<string>> {
  const config = getConfig()
  const timeoutMs = options.timeoutMs ?? config.timeoutMs
  const allowFallback = options.allowFallback ?? config.allowFallback
  const start = Date.now()

  // Configuração dos modelos (Abril 2026)
  const flashModel = process.env.GEMINI_FLASH_MODEL || 'gemini-1.5-flash-latest'
  const proModel = process.env.GEMINI_PRO_MODEL || 'gemini-3.1-pro-preview'

  // Provider default: Gemini (direto)
  if (config.provider === 'gemini') {
    const text = await geminiGenerate(prompt, flashModel, proModel)
    return {
      result: text,
      provider: 'gemini',
      durationMs: Date.now() - start,
    }
  }

  // Provider: Ollama (com timeout e fallback)
  try {
    const text = await withTimeout(
      ollamaGenerate(prompt, { temperature: options.temperature }),
      timeoutMs
    )
    console.log(`[LLM Gateway] ✅ Ollama respondeu em ${Date.now() - start}ms`)
    return { result: text, provider: 'ollama', durationMs: Date.now() - start }

  } catch (err: any) {
    const reason = err.message.includes('timeout') ? 'timeout' : 'erro'
    console.warn(`[LLM Gateway] ⚠️ Ollama falhou (${reason}): ${err.message}`)

    if (!allowFallback) {
      throw new Error(`[LLM Gateway] Ollama indisponível e fallback desativado: ${err.message}`)
    }

    // Fallback para Gemini (tentando Pro primeiro, depois Flash se 503)
    console.log('[LLM Gateway] 🔄 Usando Gemini como fallback...')
    const text = await geminiGenerate(prompt, proModel, flashModel)
    console.log(`[LLM Gateway] ✅ Gemini respondeu em ${Date.now() - start}ms (incluindo fallback)`)
    return {
      result: text,
      provider: 'gemini-fallback',
      durationMs: Date.now() - start,
    }
  }
}

// ─── Gateway: Embeddings ─────────────────────────────────────────────────────

/**
 * Gera embeddings usando o provider configurado, com fallback automático.
 * Nota: dimensões Ollama (nomic-embed-text) = 768; Gemini = 1536
 */
export async function generateEmbedding(
  text: string,
  options: EmbedOptions = {}
): Promise<LLMResponse<number[]>> {
  const config = getConfig()
  const timeoutMs = options.timeoutMs ?? config.timeoutMs
  const allowFallback = options.allowFallback ?? config.allowFallback
  const start = Date.now()

  // Provider default: Gemini
  if (config.provider === 'gemini') {
    const model = getGeminiEmbedding()
    const result = await model.embedContent({
      content: { parts: [{ text }], role: 'user' },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 768, // Mantendo 768 para compatibilidade com o banco atual do projeto
    } as any)
    return {
      result: result.embedding.values,
      provider: 'gemini',
      durationMs: Date.now() - start,
    }
  }

  // Provider: Ollama (com timeout e fallback)
  try {
    const embedding = await withTimeout(ollamaEmbed(text), timeoutMs)
    console.log(`[LLM Gateway] ✅ Ollama embed em ${Date.now() - start}ms (${embedding.length} dims)`)
    return { result: embedding, provider: 'ollama', durationMs: Date.now() - start }

  } catch (err: any) {
    const reason = err.message.includes('timeout') ? 'timeout' : 'erro'
    console.warn(`[LLM Gateway] ⚠️ Ollama embed falhou (${reason}): ${err.message}`)

    if (!allowFallback) {
      throw new Error(`[LLM Gateway] Ollama embed indisponível e fallback desativado.`)
    }

    // Fallback para Gemini
    console.log('[LLM Gateway] 🔄 Usando Gemini embed como fallback...')
    const model = getGeminiEmbedding()
    const result = await model.embedContent({
      content: { parts: [{ text }], role: 'user' },
      taskType: TaskType.RETRIEVAL_DOCUMENT,
      outputDimensionality: 768, // Atualizado para 768 para compatibilidade com pgvector (Ollama)
    } as any)
    console.log(`[LLM Gateway] ✅ Gemini embed em ${Date.now() - start}ms (fallback)`)
    return {
      result: result.embedding.values,
      provider: 'gemini-fallback',
      durationMs: Date.now() - start,
    }
  }
}
