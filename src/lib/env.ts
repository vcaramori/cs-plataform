const isServer = typeof window === 'undefined'

const required = (key: string, fallbackValue: string = ''): string => {
  const value = process.env[key]
  if (!value && isServer) {
    console.warn(`[ENV] Missing environment variable: ${key}. Using fallback: ${fallbackValue}`)
  }
  return value ?? fallbackValue
}

const numeric = (key: string, fallback: number): number => {
  const value = process.env[key]
  if (!value) return fallback
  const parsed = parseFloat(value)
  if (isNaN(parsed)) return fallback
  return parsed
}

// Fallbacks seguros para evitar crashes fatais durante a inicialização do app (Next.js SSR/build)
const DUMMY_URL = 'https://placeholder-project.supabase.co'
const DUMMY_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.dummy'

export const env = {
  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'text-embedding-004',
    embeddingDimensions: parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS ?? '768'),
    flashModel: process.env.GEMINI_FLASH_MODEL ?? 'gemini-flash-latest',
    proModel: process.env.GEMINI_PRO_MODEL ?? 'gemini-pro-latest',
  },
  llm: {
    provider: (process.env.LLM_PROVIDER ?? 'gemini') as 'gemini' | 'ollama',
    fallbackProvider: (process.env.LLM_FALLBACK_PROVIDER ?? 'gemini') as 'gemini' | 'claude',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? '60000'),
    allowFallback: process.env.LLM_ALLOW_FALLBACK !== 'false',
    ollamaUrl: process.env.OLLAMA_URL ?? 'http://localhost:11434',
    ollamaModel: process.env.OLLAMA_MODEL ?? 'qwen2.5:7b',
    ollamaEmbeddingModel: process.env.OLLAMA_EMBEDDING_MODEL ?? 'nomic-embed-text',
    ollamaNumPredict: parseInt(process.env.OLLAMA_NUM_PREDICT ?? '512'),
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS ?? '1024'),
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? required('SUPABASE_URL', DUMMY_URL),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? required('SUPABASE_ANON_KEY', DUMMY_KEY),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
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
  support: {
    defaultAssigneeId: process.env.SUPPORT_DEFAULT_ASSIGNEE_ID ?? '',
    headUserId: process.env.SUPPORT_HEAD_USER_ID ?? '',
    businessTimezone: process.env.SUPPORT_BUSINESS_TIMEZONE ?? 'America/Sao_Paulo',
    businessStart: process.env.SUPPORT_BUSINESS_START ?? '09:00',
    businessEnd: process.env.SUPPORT_BUSINESS_END ?? '18:00',
    slaPollingIntervalMinutes: parseInt(process.env.SUPPORT_SLA_POLLING_INTERVAL_MINUTES ?? '5'),
    autoCloseDefaultHours: parseInt(process.env.SUPPORT_AUTO_CLOSE_DEFAULT_HOURS ?? '48'),
    csatTimeoutDays: parseInt(process.env.SUPPORT_CSAT_TIMEOUT_DAYS ?? '5'),
    csatTokenValidityDays: parseInt(process.env.SUPPORT_CSAT_TOKEN_VALIDITY_DAYS ?? '14'),
    csatFromEmail: process.env.SUPPORT_CSAT_FROM_EMAIL ?? '',
    csatFromName: process.env.SUPPORT_CSAT_FROM_NAME ?? 'Suporte Plannera',
  },
  smtp: {
    host: process.env.SMTP_HOST ?? 'smtp.office365.com',
    port: parseInt(process.env.SMTP_PORT ?? '587'),
    user: process.env.SMTP_USER ?? '',
    pass: process.env.SMTP_PASS ?? '',
  },
} as const
