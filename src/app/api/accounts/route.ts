import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const ContractItemSchema = z.object({
  contract_code: z.string().optional(),
  mrr: z.number().nonnegative().optional(),
  start_date: z.string().optional().nullable(),
  renewal_date: z.string().optional().nullable(),
  contract_type: z.enum(['initial', 'additive', 'migration', 'renewal']).optional(),
  service_type: z.enum(['Basic', 'Professional', 'Enterprise', 'Custom']).optional(),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).optional(),
  pricing_type: z.enum(['standard', 'custom']).optional(),
  pricing_explanation: z.string().optional().nullable(),
  discount_percentage: z.number().min(0).max(100).optional(),
  discount_duration_months: z.number().int().min(0).optional(),
  description: z.string().optional().nullable(),
  contracted_hours_monthly: z.number().nonnegative().optional(),
  csm_hour_cost: z.number().nonnegative().optional(),
  notes: z.string().optional().nullable(),
})

const AccountSchema = z.object({
  company_name: z.string().min(2, 'Nome da empresa obrigatório'),
  account_name: z.string().min(2, 'Nome da logo obrigatório'),
  segment: z.enum(['Indústria', 'MRO', 'Varejo']),
  csm_owner_id: z.string().uuid().optional(),
  sales_executive_id: z.string().uuid().optional().nullable(),
  industry: z.string().optional().nullable(),
  website: z.string().url().optional().or(z.literal('')).nullable(),
  logo_url: z.string().url().optional().or(z.literal('')).nullable(),
  tax_id: z.string().optional().or(z.literal('')).nullable(),
  
  // Endereço Estruturado
  cep: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  is_international: z.boolean().default(false),
  
  // Faturamento
  billing_day: z.number().int().min(0).max(31).optional().nullable(),
  billing_rules: z.string().optional().nullable(),
  billing_contact_name: z.string().optional().nullable(),
  billing_contact_phone: z.string().optional().nullable(),
  billing_contact_email: z.string().email().optional().or(z.literal('')).nullable(),

  // Lista de Contratos
  contracts: z.array(ContractItemSchema).optional().default([]),
})

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('accounts')
    .select(`
      *,
      contracts (*)
    `)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = AccountSchema.safeParse(body)
  if (!parsed.success) {
    console.error('Validation Error (POST accounts):', parsed.error.flatten())
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const payload = parsed.data

  // 1. Criar ou buscar o client
  let clientId: string

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .ilike('name', payload.company_name)
    .limit(1)
    .maybeSingle()

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from('clients')
      .insert({
        name: payload.company_name,
        industry: payload.industry,
        website: payload.website
      })
      .select()
      .single()

    if (clientErr) return NextResponse.json({ error: clientErr.message }, { status: 500 })
    clientId = newClient.id
  }

  // 2. Criar a account
  const { data: account, error: accountErr } = await supabase
    .from('accounts')
    .insert({
      client_id: clientId,
      company_name: payload.company_name,
      name: payload.account_name,
      segment: payload.segment,
      logo_url: payload.logo_url || null,
      tax_id: payload.tax_id || null,
      
      cep: payload.cep || null,
      street: payload.street || null,
      number: payload.number || null,
      complement: payload.complement || null,
      neighborhood: payload.neighborhood || null,
      city: payload.city || null,
      state: payload.state || null,
      is_international: payload.is_international,
      
      billing_day: payload.billing_day || null,
      billing_rules: payload.billing_rules || null,
      billing_contact_name: payload.billing_contact_name || null,
      billing_contact_phone: payload.billing_contact_phone || null,
      billing_contact_email: payload.billing_contact_email || null,
      csm_owner_id: payload.csm_owner_id || user.id,
      sales_executive_id: payload.sales_executive_id || null
    })
    .select()
    .single()

  if (accountErr) return NextResponse.json({ error: accountErr.message }, { status: 500 })

  // 3. Criar os contratos se houver
  if (payload.contracts.length > 0) {
    const contractsToInsert = payload.contracts.map(c => ({
      ...c,
      account_id: account.id,
      // O banco calcula o ARR automaticamente a partir do MRR
    }))

    const { error: contractErr } = await supabase
      .from('contracts')
      .insert(contractsToInsert)
    
    if (contractErr) {
      console.error('Error creating contracts:', contractErr)
    }
  }

  return NextResponse.json(account, { status: 201 })
}

