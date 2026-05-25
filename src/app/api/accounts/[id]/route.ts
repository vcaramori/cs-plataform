import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const GovernanceItemSchema = z.object({
  id: z.string().optional(),
  rule_type: z.enum(['discount', 'penalty', 'fidelity']),
  sub_type: z.enum(['progressive', 'fixed', 'percentage', 'fidelity_penalty']),
  label: z.string(),
  value: z.number().optional().default(0),
  contract_id: z.string().uuid().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  config: z.any().optional().default({}),
  is_active: z.boolean().optional().default(true),
})

const UpdateSchema = z.object({
  company_name: z.string().min(2).optional(),
  account_name: z.string().min(2).optional(),
  segment: z.enum(['Indústria', 'MRO', 'Varejo', 'Distribuidor']).optional(),
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
  country: z.string().optional().nullable(),
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
  
  commercial_governance: z.array(GovernanceItemSchema).optional(),
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
      interactions (*, time_entries!time_entries_interaction_id_fkey(*)),
      support_tickets (*),
      health_scores (*),
      commercial_governance (*)
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

  const { account_name, commercial_governance, ...updateData } = parsed.data as any
  const finalUpdateData = {
    ...updateData,
    ...(account_name ? { name: account_name } : {})
  }

  // 1. Atualizar a account
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

  // 2. Atualizar Governança se enviado
  if (commercial_governance) {
    // Para simplificar, vamos deletar e reinserir (ou fazer upsert se houver IDs)
    // Aqui usaremos a estratégia de "substituição total" para simplificar o sync do form
    await supabase.from('commercial_governance').delete().eq('account_id', id)
    
    if (commercial_governance.length > 0) {
      const toInsert = commercial_governance.map((g: any) => ({
        ...g,
        id: g.id && g.id.length > 20 ? g.id : undefined, // Evitar IDs temporários do frontend
        starts_at: g.starts_at || null,
        ends_at: g.ends_at || null,
        account_id: id
      }))
      await supabase.from('commercial_governance').insert(toInsert)
    }
  }

  return NextResponse.json(data)
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
