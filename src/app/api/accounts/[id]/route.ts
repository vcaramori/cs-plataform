import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdateSchema = z.object({
  company_name: z.string().min(2).optional(),
  account_name: z.string().min(2).optional(),
  segment: z.enum(['Indústria', 'MRO', 'Varejo']).optional(),
  industry: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  logo_url: z.string().url().optional().or(z.literal('')).nullable(),
  tax_id: z.string().optional().or(z.literal('')).nullable(),
  
  // Endereço
  cep: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  is_international: z.boolean().optional(),
  
  // Faturamento
  billing_day: z.number().int().min(0).max(31).optional().nullable(),
  billing_rules: z.string().optional().nullable(),
  billing_contact_name: z.string().optional().nullable(),
  billing_contact_phone: z.string().optional().nullable(),
  billing_contact_email: z.string().email().optional().or(z.literal('')).nullable(),
  
  csm_owner_id: z.string().uuid().optional(),
  sales_executive_id: z.string().uuid().optional().nullable(),

  health_score: z.number().min(0).max(100).optional(),
  health_trend: z.enum(['up', 'stable', 'down', 'critical']).optional(),
})

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('accounts')
    .select(`
      *,
      contracts (*),
      contacts (*),
      interactions (*, time_entries(*)),
      support_tickets (*),
      health_scores (*)
    `)
    .eq('id', id)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 404 })
  return NextResponse.json(data)
}

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { account_name, ...updateData } = parsed.data as any
  const finalUpdateData = {
    ...updateData,
    ...(account_name ? { name: account_name } : {})
  }

  const { data, error } = await supabase
    .from('accounts')
    .update(finalUpdateData)
    .eq('id', id)
    .select()
    .single()

  if (error) {
    console.error('Supabase Error (PATCH accounts):', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  return NextResponse.json(data)
}

export async function DELETE(_: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await supabase.from('accounts').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
