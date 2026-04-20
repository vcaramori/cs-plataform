import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdateSchema = z.object({
  mrr: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().positive().optional()),
  start_date: z.string().optional().or(z.literal('')).transform(v => (v === '' || !v ? null : v)),
  renewal_date: z.string().optional().or(z.literal('')).transform(v => (v === '' || !v ? null : v)),
  service_type: z.enum(['Basic', 'Professional', 'Enterprise', 'Custom']).optional(),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).optional(),
  contracted_hours_monthly: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().min(0).optional()),
  csm_hour_cost: z.preprocess(v => (v === '' || v === null ? undefined : parseFloat(String(v))), z.number().min(0).optional()),
  contract_type: z.enum(['initial', 'additive', 'migration', 'renewal']).optional(),
  pricing_type: z.enum(['standard', 'custom']).optional(),
  pricing_explanation: z.string().optional().nullable(),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_duration_months: z.number().int().min(0).optional(),
  discount_type: z.enum(['percentage', 'fixed']).optional(),
  discount_value_brl: z.number().min(0).optional(),
  description: z.string().optional(),
  notes: z.string().optional(),
})

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
