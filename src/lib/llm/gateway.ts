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
 *   LLM_TIMEOUT_MS=60000          (timeout antes do fallback, default: 60s — CPU precisa de tempo)
 *   LLM_ALLOW_FALLBACK=true|false (default: true)
 */

import { ollamaGenerate, ollamaEmbed } from './ollama'
import { GoogleGenerativeAI, TaskType } from '@google/generative-ai'
import Anthropic from '@anthropic-ai/sdk'
import { env } from '@/lib/env'

// ─── Tipos ──────────────────────────────────────────────────────────────────

export type LLMProvider = 'ollama' | 'gemini' | 'gemini-fallback' | 'claude-fallback'

export interface GenerateOptions {
  /** Permite fallback para Provedores em nuvem se Ollama falhar. Default: true */
  allowFallback?: boolean
  /** Timeout em ms antes de acionar o fallback. Default: LLM_TIMEOUT_MS env (120s) */
  timeoutMs?: number
  /** Temperatura do modelo (0=determinístico, 1=criativo). Default: 0 */
  temperature?: number
  /** Força um provider específico, ignorando a config LLM_PROVIDER. */
  provider?: 'gemini' | 'claude'
  /** Sobrescreve max_tokens para Claude (útil para respostas longas). */
  maxTokens?: number
}

export interface EmbedOptions {
  /** Permite fallback para Gemini se Ollama falhar. Default: true */
  allowFallback?: boolean
  /** Timeout em ms antes de acionar o fallback. Default: LLM_TIMEOUT_MS env (120s) */
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
    provider: env.llm.provider,
    fallbackProvider: env.llm.fallbackProvider,
    timeoutMs: env.llm.timeoutMs,
    allowFallback: env.llm.allowFallback,
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

// ─── Providers Externos ──────────────────────────────────────────────────────

/**
 * Helper interno para geração via Gemini (Google)
 */
async function geminiGenerate(prompt: string, primaryModel: string, fallbackModel?: string): Promise<string> {
  const genAI = new GoogleGenerativeAI(env.gemini.apiKey)
  
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
 * Helper interno para geração via Claude (Anthropic)
 */
async function claudeGenerate(prompt: string, maxTokens?: number): Promise<string> {
  if (!env.claude.apiKey) {
    throw new Error('ANTHROPIC_API_KEY não configurada')
  }

  const anthropic = new Anthropic({ apiKey: env.claude.apiKey })

  try {
    const response = await anthropic.messages.create({
      model: env.claude.model,
      max_tokens: maxTokens ?? env.claude.maxTokens,
      messages: [{ role: 'user', content: prompt }],
      temperature: 0,
    })

    const content = response.content[0]
    if (content.type === 'text') {
      return content.text.trim()
    }
    return ''
  } catch (err: any) {
    throw err
  }
}

function getGeminiEmbedding() {
  const genAI = new GoogleGenerativeAI(env.gemini.apiKey)
  return genAI.getGenerativeModel(
    { model: env.gemini.embeddingModel || 'text-embedding-004' },
    { apiVersion: 'v1beta' }
  )
}

// ─── Gateway: Geração de Texto ───────────────────────────────────────────────

/**
 * Gera texto usando o provider configurado, com fallback automático.
 * Ordem de Fallback: Ollama -> Gemini -> Claude (ou conforme configurado)
 */
export async function generateText(
  prompt: string,
  options: GenerateOptions = {}
): Promise<LLMResponse<string>> {
  const config = getConfig()
  const timeoutMs = options.timeoutMs ?? config.timeoutMs
  const allowFallback = options.allowFallback ?? config.allowFallback
  const start = Date.now()

  // IDs dos modelos Gemini
  const flashModel = env.gemini.flashModel
  const proModel = env.gemini.proModel

  // Provider forçado via opção (ignora LLM_PROVIDER, mas mantém fallback)
  if (options.provider === 'claude') {
    const text = await claudeGenerate(prompt, options.maxTokens)
    return { result: text, provider: 'claude-fallback', durationMs: Date.now() - start }
  }
  if (options.provider === 'gemini') {
    try {
      // Usa proModel como primário (mesma ordem do fallback do Ollama que está funcional)
      const text = await geminiGenerate(prompt, proModel, flashModel)
      return { result: text, provider: 'gemini', durationMs: Date.now() - start }
    } catch (geminiErr: any) {
      console.warn(`[LLM Gateway] ⚠️ Gemini (forced) falhou: ${geminiErr.message}`)
      if (!allowFallback) throw geminiErr
      console.log('[LLM Gateway] 🔄 Gemini falhou, tentando Claude como fallback...')
      const text = await claudeGenerate(prompt, options.maxTokens)
      return { result: text, provider: 'claude-fallback', durationMs: Date.now() - start }
    }
  }

  // Provider Default: Gemini
  if (config.provider === 'gemini') {
    const text = await geminiGenerate(prompt, flashModel, proModel)
    return { result: text, provider: 'gemini', durationMs: Date.now() - start }
  }

  // Provider: Ollama (com timeout e fallback em cascata)
  try {
    const text = await withTimeout(
      ollamaGenerate(prompt, { temperature: options.temperature ?? 0 }),
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

    // 1. Tenta Fallback Primário (Gemini)
    try {
      console.log('[LLM Gateway] 🔄 Usando Gemini como fallback primário...')
      const text = await geminiGenerate(prompt, proModel, flashModel)
      console.log(`[LLM Gateway] ✅ Gemini respondeu em ${Date.now() - start}ms (fallback)`)
      return { result: text, provider: 'gemini-fallback', durationMs: Date.now() - start }
    } catch (geminiErr: any) {
      console.warn(`[LLM Gateway] ⚠️ Gemini também falhou: ${geminiErr.message}`)
      
      // 2. Tenta Fallback Secundário (Claude)
      try {
        console.log('[LLM Gateway] 🔄 Usando Claude como fallback de última instância...')
        const text = await claudeGenerate(prompt, options.maxTokens)
        return {
          result: text,
          provider: 'claude-fallback',
          durationMs: Date.now() - start,
        }
      } catch (claudeErr: any) {
        console.warn(`[LLM Gateway] ⚠️ Claude também falhou: ${claudeErr.message}`)
        // Fallback 2: Gemini (double fallback)
        console.log('[LLM Gateway] 🔄 Usando Gemini como double fallback...')
        const text = await geminiGenerate(prompt, proModel, flashModel)
        console.log(`[LLM Gateway] ✅ Gemini respondeu em ${Date.now() - start}ms (double fallback)`)
        return {
          result: text,
          provider: 'gemini-fallback',
          durationMs: Date.now() - start,
        }
      }
    }

    // Fallback para Gemini (tentando Pro primeiro, depois Flash se 503)
    console.log('[LLM Gateway] 🔄 Usando Gemini como fallback...')
    const text = await geminiGenerate(prompt, proModel, flashModel)
    console.log(`[LLM Gateway] ✅ Gemini respondeu em ${Date.now() - start}ms (fallback)`)
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
