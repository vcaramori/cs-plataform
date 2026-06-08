import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getModulePermission } from '@/lib/auth/get-module-permission'
import { ingestOnboardingEvent } from '@/lib/rag/rag-pipeline'

const CreateSchema = z.object({
  contract_id: z.string().uuid(),
  account_id: z.string().uuid().optional(),
  milestone_id: z.string().uuid().nullable().optional(),
  event_type: z.enum(['note', 'meeting', 'blocker', 'decision', 'status_change', 'attachment']).default('note'),
  title: z.string().optional(),
  description: z.string().optional(),
  date: z.string().optional(),
})

// GET /api/onboarding/events?contract_id=…  -> diário do contrato
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const contractId = searchParams.get('contract_id')
  if (!contractId) return NextResponse.json({ error: 'contract_id é obrigatório' }, { status: 400 })

  const admin = getSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('onboarding_events')
    .select('*')
    .eq('contract_id', contractId)
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/onboarding/events  -> registra evento no diário e ingere no RAG
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await getModulePermission(user.id, 'onboarding', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão para registrar evento de onboarding' }, { status: 403 })
  }

  const parsed = CreateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient() as any

  // Resolve account_id a partir do contrato se não informado
  let accountId = parsed.data.account_id
  if (!accountId) {
    const { data: c } = await admin.from('contracts').select('account_id').eq('id', parsed.data.contract_id).single()
    if (!c) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    accountId = c.account_id
  }

  const { data: ev, error } = await admin
    .from('onboarding_events')
    .insert({
      contract_id: parsed.data.contract_id,
      account_id: accountId,
      milestone_id: parsed.data.milestone_id ?? null,
      event_type: parsed.data.event_type,
      title: parsed.data.title ?? null,
      description: parsed.data.description ?? null,
      date: parsed.data.date ?? new Date().toISOString(),
      created_by: user.id,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try { await ingestOnboardingEvent(ev.id) } catch { /* ingest best-effort */ }

  return NextResponse.json(ev, { status: 201 })
}
