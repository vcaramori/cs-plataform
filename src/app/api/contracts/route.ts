import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const ContractSchema = z.object({
  account_id: z.string().uuid(),
  mrr: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().positive('MRR deve ser positivo')),
  start_date: z.string().optional().or(z.literal('')).transform(v => (v === "" || !v ? null : v)),
  renewal_date: z.string().optional().or(z.literal('')).transform(v => (v === "" || !v ? null : v)),
  service_type: z.enum(['Basic', 'Professional', 'Enterprise', 'Custom']).optional(),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).default('active'),
  contracted_hours_monthly: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().min(0).optional().default(0)),
  csm_hour_cost: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().min(0).optional().default(0)),
  contract_type: z.enum(['initial', 'additive', 'migration', 'renewal']).default('initial'),
  notes: z.string().optional(),
  description: z.string().optional(),
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
  return NextResponse.json(data, { status: 201 })
}
