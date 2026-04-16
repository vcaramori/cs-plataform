/**
 * Cliente Claude (Anthropic) — fallback LLM
 * Usa claude-haiku-4-5 por padrão: rápido e barato para uso como fallback.
 * Embeddings não são suportados pelo Claude; para embed o fallback continua sendo Gemini.
 */

import Anthropic from '@anthropic-ai/sdk'

export interface ClaudeGenerateOptions {
  model?: string
  temperature?: number
  maxTokens?: number
}

/**
 * Gera texto via Claude (Anthropic SDK)
 */
export async function claudeGenerate(
  prompt: string,
  options: ClaudeGenerateOptions = {}
): Promise<string> {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
  })

  const model = options.model || process.env.CLAUDE_MODEL || 'claude-haiku-4-5'
  const maxTokens = options.maxTokens ?? parseInt(process.env.CLAUDE_MAX_TOKENS || '1024')

  const response = await client.messages.create({
    model,
    max_tokens: maxTokens,
    messages: [{ role: 'user', content: prompt }],
  })

  const textBlock = response.content.find((b): b is Anthropic.TextBlock => b.type === 'text')
  if (!textBlock) throw new Error('[Claude] Resposta não contém bloco de texto')

  return textBlock.text.trim()
}
