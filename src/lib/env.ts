const isServer = typeof window === 'undefined'

const required = (key: string): string => {
  const value = process.env[key]
  if (!value && isServer) throw new Error(`Missing required environment variable: ${key}`)
  return value ?? ''
}

const numeric = (key: string, fallback: number): number => {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = parseFloat(value)
  if (isNaN(parsed)) throw new Error(`Environment variable ${key} must be a number`)
  return parsed
}

export const env = {
  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    // text-embedding-004: modelo estável, 768 dims, suporta RETRIEVAL_DOCUMENT e RETRIEVAL_QUERY
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
    embeddingDimensions: parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS ?? '768'),
    flashModel: process.env.GEMINI_FLASH_MODEL ?? 'gemini-flash-latest',
    proModel: process.env.GEMINI_PRO_MODEL ?? 'gemini-pro-latest',
  },
  llm: {
    provider: (process.env.LLM_PROVIDER ?? 'gemini') as 'gemini' | 'ollama',
    // fallbackProvider: qual LLM usar quando Ollama falha (gemini | claude). Default: gemini.
    fallbackProvider: (process.env.LLM_FALLBACK_PROVIDER ?? 'gemini') as 'gemini' | 'claude',
    // 60s — CPU precisa de ~25-50s para 512 tokens no qwen2.5:1.5b; deixa margem para prompts maiores.
    // Com GPU ou modelo remoto, pode reduzir para 15000.
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? '60000'),
    allowFallback: process.env.LLM_ALLOW_FALLBACK !== 'false',
    ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen2.5:1.5b',
    ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text',
    // Tokens máximos por resposta. 512 é seguro para CPU; aumente com OLLAMA_NUM_PREDICT no .env.
    ollamaNumPredict: parseInt(process.env.OLLAMA_NUM_PREDICT ?? '512'),
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    // claude-haiku-4-5: mais rápido/barato — ideal como fallback de geração de texto.
    model: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS ?? '1024'),
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? required('SUPABASE_URL'),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? required('SUPABASE_ANON_KEY'),
    serviceRoleKey: required('SUPABASE_SERVICE_ROLE_KEY'),
  },
  chunking: {
    chunkSize: parseInt(process.env.CHUNK_SIZE ?? '512'),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP ?? '50'),
  },
  thresholds: {
    sentimentAlert: numeric('SENTIMENT_ALERT_THRESHOLD', -0.4),
    costToServeWarn: numeric('COST_TO_SERVE_WARN', 0.15),
    costToServeCritical: numeric('COST_TO_SERVE_CRITICAL', 0.30),
    vectorTopK: parseInt(process.env.VECTOR_TOP_K ?? '8'),
  },
  airtable: {
    token: process.env.AIRTABLE_TOKEN ?? '',
  },
} as const
