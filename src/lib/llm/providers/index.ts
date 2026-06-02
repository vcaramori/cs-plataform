import type { LLMProvider, LLMProviderAdapter } from './types'
import { geminiAdapter } from './gemini-adapter'
import { claudeAdapter } from './claude-adapter'
import { openaiAdapter } from './openai-adapter'
import { groqAdapter } from './groq-adapter'
import { openrouterAdapter } from './openrouter-adapter'
import { nvidiaAdapter } from './nvidia-adapter'

const adapters: Record<LLMProvider, LLMProviderAdapter> = {
  gemini: geminiAdapter,
  claude: claudeAdapter,
  openai: openaiAdapter,
  groq: groqAdapter,
  openrouter: openrouterAdapter,
  nvidia: nvidiaAdapter,
}

export function getAdapter(provider: LLMProvider): LLMProviderAdapter {
  const adapter = adapters[provider]
  if (!adapter) throw new Error(`[LLM] Unknown provider: ${provider}`)
  return adapter
}

export function getAllProviders(): { id: LLMProvider; adapter: LLMProviderAdapter }[] {
  return Object.entries(adapters).map(([id, adapter]) => ({
    id: id as LLMProvider,
    adapter,
  }))
}

export type { LLMProvider, LLMProviderAdapter, ModelOption } from './types'
