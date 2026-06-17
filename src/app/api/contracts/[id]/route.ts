import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { syncContractLinks } from '@/lib/contracts/links'
import { backfillResponsesForInstance } from '@/lib/nps/instance'

// Premissa: o front pode mandar o contrato cru (campos null vindos do banco). null = "não
// alterar" → removemos nulls antes de validar, evitando 400 em campos optional não-nullable.
const stripNulls = (raw: unknown) => {
  if (!raw || typeof raw !== 'object') return raw
  const out: Record<string, unknown> = {}
  for (const [k, v] of Object.entries(raw as Record<string, unknown>)) if (v !== null) out[k] = v
  return out
}

const UpdateSchema = z.preprocess(stripNulls, z.object({
  mrr: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().positive().optional()),
  start_date: z.string().optional().or(z.literal('')).transform(v => (v === '' || !v ? null : v)),
  renewal_date: z.string().optional().or(z.literal('')).transform(v => (v === '' || !v ? null : v)),
  service_type: z.string().optional(),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).optional(),
  contracted_hours_monthly: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().min(0).optional()),
  csm_hour_cost: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().min(0).optional()),
  contract_type: z.enum(['initial', 'additive', 'migration', 'renewal']).optional(),
  pricing_type: z.enum(['standard', 'custom']).optional(),
  pricing_explanation: z.string().optional().nullable(),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_duration_months: z.number().int().min(0).optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_fixed_amount: z.number().min(0).optional(),
  fine_amount: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().min(0).optional()),
  fidelity_months: z.preprocess(v => (v === '' || v === null ? undefined : parseInt(String(v), 10)), z.number().int().min(0).optional()),
  progressive_discounts: z.array(z.object({
    label: z.string(),
    discount: z.number(),
    type: z.enum(['percentage', 'fixed'])
  })).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
  instance_url: z.string().optional().nullable(),
}))

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('contracts')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Supabase Error (PATCH contracts):', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Re-sincroniza os vínculos FK a partir do service_type final do contrato
  await syncContractLinks(id, (data as any).service_type)

  // Vínculo retroativo: religa respostas de NPS órfãs cuja instância bate com a
  // instance_url do contrato.
  if ((data as any).instance_url && (data as any).account_id) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = getSupabaseAdminClient() as any
    const linked = await backfillResponsesForInstance(adminDb, (data as any).instance_url, (data as any).account_id)
    if (linked > 0) console.log(`[contracts] backfill NPS: ${linked} resposta(s) religada(s) à conta ${(data as any).account_id}`)
  }

  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('contracts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
