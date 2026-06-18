import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { syncContractLinks } from '@/lib/contracts/links'
import { backfillResponsesForInstance } from '@/lib/nps/instance'

// Coerce numérico robusto: '', null, undefined e valores não-numéricos viram undefined
// (deixando .default()/.optional() agir) — evita NaN quando o campo não vem no payload.
const num = (v: unknown): number | undefined => {
  if (v === '' || v === null || v === undefined) return undefined
  const n = typeof v === 'number' ? v : parseFloat(String(v).replace(/\s/g, '').replace(',', '.'))
  return Number.isNaN(n) ? undefined : n
}

const ContractSchema = z.object({
  account_id: z.string().uuid(),
  contract_code: z.string().optional().nullable(),
  mrr: z.preprocess(num, z.number().nonnegative('MRR deve ser positivo')),
  start_date: z.string().optional().or(z.literal('')).nullable().transform(v => (v === "" || !v ? null : v)),
  renewal_date: z.string().optional().or(z.literal('')).nullable().transform(v => (v === "" || !v ? null : v)),
  service_type: z.string().optional(),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).default('active'),
  contracted_hours_monthly: z.preprocess(num, z.number().min(0).optional().default(0)),
  csm_hour_cost: z.preprocess(num, z.number().min(0).optional().default(0)),
  contract_type: z.enum(['initial', 'additive', 'migration', 'renewal']).default('initial'),
  pricing_type: z.enum(['standard', 'custom']).default('standard'),
  pricing_explanation: z.string().optional().nullable(),
  discount_percentage: z.number().min(0).max(100).optional().default(0),
  discount_duration_months: z.number().int().min(0).optional().default(0),
  discount_type: z.enum(['percentage', 'fixed']).default('percentage'),
  discount_fixed_amount: z.number().min(0).optional().default(0),
  notes: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
  instance_url: z.string().optional().nullable(),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = ContractSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await supabase
    .from('contracts')
    .insert(parsed.data)
    .select()
    .single()

  if (error) {
    console.error('Supabase Error (POST contracts):', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Migração service_type → FKs: sincroniza contract_plans / contract_products
  await syncContractLinks(data.id, data.service_type)

  // Vínculo retroativo: religa respostas de NPS órfãs cuja instância bate com a
  // instance_url recém-cadastrada.
  if (data.instance_url) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const adminDb = getSupabaseAdminClient() as any
    const linked = await backfillResponsesForInstance(adminDb, data.instance_url, data.account_id)
    if (linked > 0) console.log(`[contracts] backfill NPS: ${linked} resposta(s) religada(s) à conta ${data.account_id}`)
  }

  return NextResponse.json(data, { status: 201 })
}
