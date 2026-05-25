import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const INSTRUCTION_KEYS = [
  'rag_system_instruction',
  'instruction_chat',
  'instruction_review_reply',
  'instruction_shadow_score',
  'instruction_auto_checkin',
] as const

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
    .in('key', ['rag_ai_settings', ...INSTRUCTION_KEYS])

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const result: Record<string, unknown> = {}
  for (const row of data ?? []) {
    result[row.key] = row.value
  }

  return NextResponse.json(result)
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { module, settings } = body as { module: string; settings: Record<string, unknown> }

  if (module !== 'ai') {
    return NextResponse.json({ error: 'Module not supported' }, { status: 400 })
  }

  const admin = getSupabaseAdminClient()
  const db = admin as any

  const { rag_system_instruction, instruction_chat, instruction_review_reply,
    instruction_shadow_score, instruction_auto_checkin, ...aiSettings } = settings

  const upserts = [
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

  const { error } = await db
    .from('app_settings')
    .upsert(upserts, { onConflict: 'key' })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ ok: true })
}
