import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getModulePermission } from '@/lib/auth/get-module-permission'
import { ingestNegotiation } from '@/lib/rag/rag-pipeline'

const CreateSchema = z.object({
  contract_id: z.string().uuid(),
  account_id: z.string().uuid().optional(),
  negotiation_type: z.enum(['initial', 'renewal', 'renegotiation']).default('renewal'),
  date: z.string().optional(),
  discount_offered_pct: z.number().optional(),
  discount_accepted_pct: z.number().optional(),
  main_objection: z.string().optional(),
  closing_argument: z.string().optional(),
  counterpart_name: z.string().optional(),
  counterpart_role: z.string().optional(),
  outcome: z.enum(['won', 'renewed', 'lost', 'pending']).optional(),
  notes: z.string().optional(),
})

// GET /api/contracts/negotiation?contract_id=…  -> histórico de negociação do contrato
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const contractId = searchParams.get('contract_id')
  if (!contractId) return NextResponse.json({ error: 'contract_id é obrigatório' }, { status: 400 })

  const admin = getSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('contract_negotiation_history')
    .select('*')
    .eq('contract_id', contractId)
    .order('date', { ascending: false })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/contracts/negotiation  -> registra negociação (venda inicial / renovação) + ingest RAG
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await getModulePermission(user.id, 'contracts', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão para registrar negociação' }, { status: 403 })
  }

  const parsed = CreateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient() as any

  let accountId = parsed.data.account_id
  if (!accountId) {
    const { data: c } = await admin.from('contracts').select('account_id').eq('id', parsed.data.contract_id).single()
    if (!c) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })
    accountId = c.account_id
  }

  const { data: row, error } = await admin
    .from('contract_negotiation_history')
    .insert({
      contract_id: parsed.data.contract_id,
      account_id: accountId,
      negotiation_type: parsed.data.negotiation_type,
      date: parsed.data.date ?? new Date().toISOString(),
      discount_offered_pct: parsed.data.discount_offered_pct ?? 0,
      discount_accepted_pct: parsed.data.discount_accepted_pct ?? 0,
      main_objection: parsed.data.main_objection ?? null,
      closing_argument: parsed.data.closing_argument ?? null,
      counterpart_name: parsed.data.counterpart_name ?? null,
      counterpart_role: parsed.data.counterpart_role ?? null,
      outcome: parsed.data.outcome ?? null,
      notes: parsed.data.notes ?? null,
      created_by: user.id,
    })
    .select('*')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  try { await ingestNegotiation(row.id) } catch { /* ingest best-effort */ }

  return NextResponse.json(row, { status: 201 })
}
