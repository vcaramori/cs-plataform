import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { encrypt, maskApiKey } from '@/lib/crypto/encryption'
import { invalidateLLMSettingsCache } from '@/lib/llm/settings'
import { invalidateAIContextCache } from '@/lib/ai/ai-context'
import { invalidateSopGlossaryCache } from '@/lib/opportunities/glossary'
import { AI_INSTRUCTIONS } from '@/lib/ai/instructions-catalog'
import type { LLMProvider } from '@/lib/llm/providers/types'

const INSTRUCTION_KEYS = [
  'rag_system_instruction',
  'instruction_chat',
  'instruction_review_reply',
  'instruction_shadow_score',
  'instruction_auto_checkin',
] as const

const LLM_PROVIDERS: LLMProvider[] = ['gemini', 'claude', 'openai', 'groq', 'openrouter', 'nvidia']

async function requireAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null

  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) return null
  return user
}

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient()
  const { data, error } = await (admin as any)
    .from('app_settings')
    .select('key, value')
    .in('key', ['rag_ai_settings', 'llm_provider_keys', 'ai_global_context', 'ai_context_rules', 'sop_glossary', ...INSTRUCTION_KEYS, ...AI_INSTRUCTIONS.map((i) => i.key)])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: Record<string, unknown> = {}
  for (const row of data ?? []) {
    if (row.key === 'llm_provider_keys') {
      const keys = row.value as Record<string, string> | null
      // Return a simple boolean-like object: 'saved' = has key, '' = not configured
      const masked: Record<string, string> = {}
      for (const provider of LLM_PROVIDERS) {
        masked[provider] = keys && keys[provider] ? maskApiKey('configured') : ''
      }
      result.llm_provider_keys = masked
    } else {
      result[row.key] = row.value
    }
  }

  return NextResponse.json(result)
}


export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const { module, settings } = body as { module: string; settings: Record<string, unknown> }

    const admin = getSupabaseAdminClient()
    const db = admin as any

    // ── Governança de IA: contexto global + regras + instruções por tarefa ──
    if (module === 'ai_context') {
      const globalContext = settings.ai_global_context
      const rules = settings.ai_context_rules
      const instructions = (settings.instructions ?? {}) as Record<string, string>

      const ctxUpserts: any[] = []
      if (typeof globalContext === 'string') {
        ctxUpserts.push({ key: 'ai_global_context', value: globalContext, description: 'Contexto global das IAs', updated_by: user.id })
      }
      if (rules && typeof rules === 'object') {
        ctxUpserts.push({ key: 'ai_context_rules', value: rules, description: 'Regras numéricas das IAs', updated_by: user.id })
      }
      const validKeys = new Set(AI_INSTRUCTIONS.map((i) => i.key))
      for (const [k, v] of Object.entries(instructions)) {
        if (validKeys.has(k) && typeof v === 'string') {
          ctxUpserts.push({ key: k, value: v, description: `Instrução: ${k}`, updated_by: user.id })
        }
      }

      // Glossário S&OP (siglas/módulos correlatos) — usado na extração de oportunidades
      const glossary = settings.sop_glossary
      if (glossary && typeof glossary === 'object') {
        ctxUpserts.push({ key: 'sop_glossary', value: glossary, description: 'Glossário S&OP (siglas/módulos correlatos)', updated_by: user.id })
      }

      if (ctxUpserts.length > 0) {
        const { error } = await db.from('app_settings').upsert(ctxUpserts, { onConflict: 'key' })
        if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      }
      invalidateAIContextCache()
      invalidateSopGlossaryCache()
      return NextResponse.json({ ok: true })
    }

    if (module !== 'ai') {
      return NextResponse.json({ error: 'Module not supported' }, { status: 400 })
    }

    const {
      rag_system_instruction, instruction_chat, instruction_review_reply,
      instruction_shadow_score, instruction_auto_checkin,
      llm_keys,
      ...aiSettings
    } = settings

    // Detect embedding provider change for re-index
    let reindexTriggered = false
    if (aiSettings.embedding_provider || aiSettings.embedding_model) {
      const { data: currentSettings } = await db
        .from('app_settings')
        .select('value')
        .eq('key', 'rag_ai_settings')
        .single()

      const current = currentSettings?.value ?? {}
      if (
        (aiSettings.embedding_provider && aiSettings.embedding_provider !== current.embedding_provider) ||
        (aiSettings.embedding_model && aiSettings.embedding_model !== current.embedding_model)
      ) {
        reindexTriggered = true
      }
    }

    const upserts: any[] = [
      {
        key: 'rag_ai_settings',
        value: aiSettings,
        description: 'AI model and RAG engine parameters',
        updated_by: user.id,
      },
      {
        key: 'rag_system_instruction',
        value: rag_system_instruction ?? '',
        description: 'System instruction do Plannera Assistant (módulo Perguntar)',
        updated_by: user.id,
      },
      {
        key: 'instruction_chat',
        value: instruction_chat ?? '',
        description: 'System instruction do Chat Rápido',
        updated_by: user.id,
      },
      {
        key: 'instruction_review_reply',
        value: instruction_review_reply ?? '',
        description: 'System instruction do Revisor de Respostas',
        updated_by: user.id,
      },
      {
        key: 'instruction_shadow_score',
        value: instruction_shadow_score ?? '',
        description: 'System instruction do Shadow Health Score',
        updated_by: user.id,
      },
      {
        key: 'instruction_auto_checkin',
        value: instruction_auto_checkin ?? '',
        description: 'System instruction do Auto Check-in',
        updated_by: user.id,
      },
    ]

    // Encrypt and save API keys
    if (llm_keys && typeof llm_keys === 'object') {
      const keysObj = llm_keys as Record<string, string>
      const encryptedKeys: Record<string, string> = {}

      // Load existing encrypted keys to preserve unchanged ones
      const { data: existingRow } = await db
        .from('app_settings')
        .select('value')
        .eq('key', 'llm_provider_keys')
        .single()

      const existingKeys = (existingRow?.value as Record<string, string>) ?? {}

      for (const provider of LLM_PROVIDERS) {
        const newKey = keysObj[provider]
        if (newKey && newKey.trim().length > 0) {
          // chave-mestra auto-provisionada no banco (ver crypto/encryption.ts)
          encryptedKeys[provider] = await encrypt(newKey)
        } else if (existingKeys[provider]) {
          encryptedKeys[provider] = existingKeys[provider]
        }
      }

      upserts.push({
        key: 'llm_provider_keys',
        value: encryptedKeys,
        description: 'Encrypted LLM provider API keys',
        updated_by: user.id,
      })
    }

    const { error } = await db
      .from('app_settings')
      .upsert(upserts, { onConflict: 'key' })

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    invalidateLLMSettingsCache()

    return NextResponse.json({ ok: true, reindexTriggered })
  } catch (err: any) {
    console.error('[Admin Settings POST] Error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
