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
    flashModel: process.env.GEMINI_FLASH_MODEL ?? 'gemini-2.0-flash',
    proModel: process.env.GEMINI_PRO_MODEL ?? 'gemini-2.5-pro',
  },
  llm: {
    provider: (process.env.LLM_PROVIDER ?? 'gemini') as 'gemini' | 'ollama',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? '30000'),
    allowFallback: process.env.LLM_ALLOW_FALLBACK !== 'false',
    ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
    ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text',
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
} as const
