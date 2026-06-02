import { env } from '@/lib/env'
import type { LLMProvider } from './providers/types'

export interface LLMSettings {
  textProvider: LLMProvider
  textModel: string
  fallbackTextProvider: LLMProvider | 'none'
  fallbackTextModel: string
  embeddingProvider: LLMProvider
  embeddingModel: string
  fallbackEmbeddingProvider: LLMProvider | 'none'
  fallbackEmbeddingModel: string
  embeddingDimensions: number
  temperature: number
  maxTokens: number
  apiKeys: Partial<Record<LLMProvider, string>>
  ragTopK: number
  ragConfidenceThreshold: number
  ragCacheTtlHours: number
}

const CACHE_TTL_MS = 60_000

let cache: { data: LLMSettings; timestamp: number } | null = null

function buildFallbackSettings(): LLMSettings {
  return {
    textProvider: 'gemini',
    textModel: env.gemini.flashModel,
    fallbackTextProvider: 'none',
    fallbackTextModel: '',
    embeddingProvider: 'gemini',
    embeddingModel: env.gemini.embeddingModel,
    fallbackEmbeddingProvider: 'none',
    fallbackEmbeddingModel: '',
    embeddingDimensions: env.gemini.embeddingDimensions,
    temperature: 0,
    maxTokens: 2048,
    apiKeys: {
      gemini: env.gemini.apiKey,
      claude: env.claude.apiKey || undefined,
    },
    ragTopK: env.thresholds.vectorTopK,
    ragConfidenceThreshold: 0.7,
    ragCacheTtlHours: 24,
  }
}

export async function getLLMSettings(): Promise<LLMSettings> {
  if (cache && Date.now() - cache.timestamp < CACHE_TTL_MS) {
    return cache.data
  }

  try {
    const { getSupabaseAdminClient } = await import('@/lib/supabase/admin')
    const admin = getSupabaseAdminClient()

    const { data: rows } = await (admin as any)
      .from('app_settings')
      .select('key, value')
      .in('key', ['rag_ai_settings', 'llm_provider_keys'])

    if (!rows || rows.length === 0) {
      const fallback = buildFallbackSettings()
      cache = { data: fallback, timestamp: Date.now() }
      return fallback
    }

    const settingsMap: Record<string, any> = {}
    for (const row of rows) {
      settingsMap[row.key] = row.value
    }

    const aiSettings = settingsMap.rag_ai_settings ?? {}
    const encryptedKeys = settingsMap.llm_provider_keys ?? {}

    const apiKeys: Partial<Record<LLMProvider, string>> = {}
    const { decrypt } = await import('@/lib/crypto/encryption')

    for (const provider of ['gemini', 'claude', 'openai', 'groq'] as LLMProvider[]) {
      const encrypted = encryptedKeys[provider]
      if (encrypted && typeof encrypted === 'string' && encrypted.includes(':')) {
        try {
          apiKeys[provider] = decrypt(encrypted)
        } catch {
          // Decryption failed — key might be corrupt, use env fallback
        }
      }
    }

    if (!apiKeys.gemini && env.gemini.apiKey) apiKeys.gemini = env.gemini.apiKey
    if (!apiKeys.claude && env.claude.apiKey) apiKeys.claude = env.claude.apiKey

    const settings: LLMSettings = {
      textProvider: (aiSettings.text_provider as LLMProvider) ?? 'gemini',
      textModel: aiSettings.text_model ?? env.gemini.flashModel,
      fallbackTextProvider: (aiSettings.fallback_text_provider as LLMProvider | 'none') ?? 'none',
      fallbackTextModel: aiSettings.fallback_text_model ?? '',
      embeddingProvider: (aiSettings.embedding_provider as LLMProvider) ?? 'gemini',
      embeddingModel: aiSettings.embedding_model ?? env.gemini.embeddingModel,
      fallbackEmbeddingProvider: (aiSettings.fallback_embedding_provider as LLMProvider | 'none') ?? 'none',
      fallbackEmbeddingModel: aiSettings.fallback_embedding_model ?? '',
      embeddingDimensions: aiSettings.embedding_dimensions ?? env.gemini.embeddingDimensions,
      temperature: aiSettings.temperature ?? 0,
      maxTokens: aiSettings.max_tokens_response ?? 2048,
      apiKeys,
      ragTopK: aiSettings.rag_top_k ?? env.thresholds.vectorTopK,
      ragConfidenceThreshold: aiSettings.rag_confidence_threshold ?? 0.7,
      ragCacheTtlHours: aiSettings.rag_cache_ttl_hours ?? 24,
    }

    cache = { data: settings, timestamp: Date.now() }
    return settings
  } catch (err) {
    console.error('[LLM Settings] Failed to load from DB, using env fallback:', err)
    const fallback = buildFallbackSettings()
    cache = { data: fallback, timestamp: Date.now() }
    return fallback
  }
}

export function invalidateLLMSettingsCache(): void {
  cache = null
}
