import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const ContractSchema = z.object({
  account_id: z.string().uuid(),
  mrr: z.number().positive(),
  start_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  renewal_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  service_type: z.enum(['Basic', 'Professional', 'Enterprise', 'Custom']),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).default('active'),
  contracted_hours_monthly: z.number().min(0),
  csm_hour_cost: z.number().min(0),
  notes: z.string().optional(),
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

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
