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

const isProd = process.env.NODE_ENV === 'production'
// Escape hatch para etapas de build sem env (ex.: análise estática): defina
// SKIP_ENV_VALIDATION=true. No runtime de produção, mantenha desligado.
const skipEnvValidation = process.env.SKIP_ENV_VALIDATION === 'true'

/** Credencial obrigatória: em produção (servidor) falha alto se ausente,
 *  evitando o app subir silenciosamente apontando para um Supabase fake. */
const requiredStrict = (key: string, dummy: string): string => {
  const value = process.env[key]
  if (value) return value
  if (isServer && isProd && !skipEnvValidation) {
    throw new Error(`[ENV] Variável obrigatória ausente em produção: ${key}`)
  }
  if (isServer) console.warn(`[ENV] ${key} ausente — usando fallback de desenvolvimento`)
  return dummy
}

export const env = {
  gemini: {
    apiKey: required('GEMINI_API_KEY'),
    embeddingModel: process.env.GEMINI_EMBEDDING_MODEL ?? 'gemini-embedding-001',
    embeddingDimensions: parseInt(process.env.GEMINI_EMBEDDING_DIMENSIONS ?? '1536'),
    flashModel: process.env.GEMINI_FLASH_MODEL ?? 'gemini-flash-latest',
    proModel: process.env.GEMINI_PRO_MODEL ?? 'gemini-pro-latest',
  },
  llm: {
    provider: (process.env.LLM_PROVIDER ?? 'gemini') as 'gemini',
    fallbackProvider: (process.env.LLM_FALLBACK_PROVIDER ?? 'gemini') as 'gemini' | 'claude',
    timeoutMs: parseInt(process.env.LLM_TIMEOUT_MS ?? '60000'),
    allowFallback: process.env.LLM_ALLOW_FALLBACK !== 'false',
  },
  claude: {
    apiKey: process.env.ANTHROPIC_API_KEY ?? '',
    model: process.env.CLAUDE_MODEL ?? 'claude-haiku-4-5',
    maxTokens: parseInt(process.env.CLAUDE_MAX_TOKENS ?? '1024'),
  },
  supabase: {
    url: process.env.NEXT_PUBLIC_SUPABASE_URL ?? requiredStrict('SUPABASE_URL', DUMMY_URL),
    anonKey: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? requiredStrict('SUPABASE_ANON_KEY', DUMMY_KEY),
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY ?? '',
  },
  chunking: {
    // 1024 tokens: dobra o contexto coeso por chunk e fica dentro do teto de
    // ~2048 tokens do gemini-embedding-001 (3k truncaria). Dimensão de saída
    // segue 1536 (independe do chunk). embeddings estava vazio → sem re-ingestão.
    chunkSize: parseInt(process.env.CHUNK_SIZE ?? '1024'),
    chunkOverlap: parseInt(process.env.CHUNK_OVERLAP ?? '128'),
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
  // HelpDesk (LiveChat/Text Inc) — sincronização automática de chamados.
  // Autenticação por Bearer token (o token do app web; renovado pelo GitHub Actions
  // e guardado em app_settings.helpdesk_token). Não exige a API paga.
  helpdesk: {
    // Bearer token do app web (cookie credentials.access_token, dura ~5 dias).
    // Em runtime o cron lê de app_settings.helpdesk_token; este env é fallback/bootstrap.
    bearerToken: process.env.HELPDESK_BEARER_TOKEN ?? '',
    baseUrl: process.env.HELPDESK_API_BASE_URL ?? 'https://api.helpdesk.com/v1',
    // Conta padrão (UUID em accounts) usada quando a cascata de resolução não casar.
    // Vazio = pula o chamado e registra em erros (não cria lixo).
    fallbackAccountId: process.env.HELPDESK_FALLBACK_ACCOUNT_ID ?? '',
  },
  // MCP da ferramenta (servidor de tools para agentes). Token = segredo (server-only).
  // actorUserId: usuário real (auth.users.id) atribuído a lançamentos feitos pelo agente
  // (time_entries.csm_id / interactions.csm_id são NOT NULL com FK). Pode ser sobrescrito
  // por argumento acting_user_id na chamada da tool.
  mcp: {
    token: process.env.MCP_API_TOKEN ?? '',
    enabled: process.env.MCP_ENABLED !== 'false',
    actorUserId: process.env.MCP_ACTOR_USER_ID ?? '',
  },
  // PSA — apontamento de horas de implantação (Edge Function teams-bot).
  // LIGADO por padrão: todo esforço de onboarding é enviado automaticamente.
  // A URL tem default embutido em src/lib/integrations/psa.ts (server-only);
  // pode ser sobrescrita por PSA_TEAMS_BOT_URL. Para DESLIGAR: PSA_SYNC_ENABLED=false.
  psa: {
    teamsBotUrl: process.env.PSA_TEAMS_BOT_URL ?? '',
    token: process.env.PSA_INTEGRATION_TOKEN ?? '',
    enabled: process.env.PSA_SYNC_ENABLED !== 'false',
    timeoutMs: parseInt(process.env.PSA_TIMEOUT_MS ?? '10000'),
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
  crypto: {
    encryptionKey: process.env.ENCRYPTION_KEY ?? '',
  },
  app: {
    instanceName: process.env.NEXT_PUBLIC_INSTANCE_NAME ?? 'CS-Continuum',
  },
} as const
