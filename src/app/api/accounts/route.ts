import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AccountFilterSchema } from '@/lib/filters/account-filters.schema'

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

const AccountSchema = z.object({
  company_name: z.string().min(2, 'Nome da empresa obrigatório'),
  account_name: z.string().min(2, 'Nome da logo obrigatório'),
  segment: z.enum(['Indústria', 'MRO', 'Varejo', 'Distribuidor']),
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
  country: z.string().optional().nullable(),
  is_international: z.boolean().default(false),
  
  // Faturamento
  billing_day: z.number().int().min(0).max(31).optional().nullable(),
  billing_rules: z.string().optional().nullable(),
  billing_contact_name: z.string().optional().nullable(),
  billing_contact_phone: z.string().optional().nullable(),
  billing_contact_email: z.string().email().optional().or(z.literal('')).nullable(),

  // Lista de Contratos e Governança
  contracts: z.array(ContractItemSchema).optional().default([]),
  commercial_governance: z.array(GovernanceItemSchema).optional().default([]),
})

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Parse query parameters
  const url = new URL(request.url)
  const params = {
    health_status: url.searchParams.get('health_status') || undefined,
    segment: url.searchParams.get('segment') || undefined,
    mrr_min: url.searchParams.get('mrr_min') ? parseFloat(url.searchParams.get('mrr_min')!) : undefined,
    mrr_max: url.searchParams.get('mrr_max') ? parseFloat(url.searchParams.get('mrr_max')!) : undefined,
    renewal_date_min: url.searchParams.get('renewal_date_min') || undefined,
    renewal_date_max: url.searchParams.get('renewal_date_max') || undefined,
    contract_status: url.searchParams.get('contract_status') || undefined,
    adoption_min: url.searchParams.get('adoption_min') ? parseFloat(url.searchParams.get('adoption_min')!) : undefined,
    adoption_max: url.searchParams.get('adoption_max') ? parseFloat(url.searchParams.get('adoption_max')!) : undefined,
    csm_id: url.searchParams.get('csm_id') || undefined,
  }

  // Validate filters with Zod
  const parsed = AccountFilterSchema.safeParse(params)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Start with base query (RLS: CSM can only see their own accounts)
  let query = supabase
    .from('accounts')
    .select(`
      *,
      contracts (*)
    `)

  // Apply CSM ownership filter (RLS)
  if (parsed.data.csm_id) {
    query = query.eq('csm_owner_id', parsed.data.csm_id)
  } else {
    // If no CSM filter specified, default to current user's accounts
    query = query.eq('csm_owner_id', user.id)
  }

  // Apply health_status filter
  if (parsed.data.health_status) {
    query = query.eq('health_status', parsed.data.health_status)
  }

  // Apply segment filter
  if (parsed.data.segment) {
    query = query.eq('segment', parsed.data.segment)
  }

  // Apply MRR range filters via contracts relationship
  if (parsed.data.mrr_min !== undefined || parsed.data.mrr_max !== undefined) {
    // Note: Supabase doesn't support filtering via relationships easily,
    // so we'll fetch all and filter in-memory for now
  }

  // Apply contract_status filter
  if (parsed.data.contract_status) {
    // Similar limitation - will filter in-memory
  }

  // Execute query
  const { data, error } = await query.order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // In-memory filtering for MRR and contract status
  let filtered = data || []

  if (parsed.data.mrr_min !== undefined || parsed.data.mrr_max !== undefined) {
    filtered = filtered.filter(account => {
      const contracts = Array.isArray(account.contracts) ? account.contracts : []
      const totalMRR = contracts
        .filter((c: any) => c.status === 'active')
        .reduce((sum: number, c: any) => sum + (Number(c.mrr) || 0), 0)

      if (parsed.data.mrr_min !== undefined && totalMRR < parsed.data.mrr_min) return false
      if (parsed.data.mrr_max !== undefined && totalMRR > parsed.data.mrr_max) return false
      return true
    })
  }

  if (parsed.data.contract_status) {
    filtered = filtered.filter(account => {
      const contracts = Array.isArray(account.contracts) ? account.contracts : []
      return contracts.some((c: any) => c.status === parsed.data.contract_status)
    })
  }

  if (parsed.data.adoption_min !== undefined || parsed.data.adoption_max !== undefined) {
    // adoption filtering would require joining with adoption table
    // Placeholder for future implementation
  }

  return NextResponse.json(filtered)
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
      country: payload.country || null,
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
    }))

    const { error: contractErr } = await supabase
      .from('contracts')
      .insert(contractsToInsert)
    
    if (contractErr) console.error('Error creating contracts:', contractErr)
  }

  // 4. Criar as regras de governança se houver
  if (payload.commercial_governance.length > 0) {
    const governanceToInsert = payload.commercial_governance.map(g => ({
      ...g,
      starts_at: g.starts_at || null,
      ends_at: g.ends_at || null,
      account_id: account.id,
    }))

    const { error: govErr } = await supabase
      .from('commercial_governance')
      .insert(governanceToInsert)

    if (govErr) console.error('Error creating governance rules:', govErr)
  }

  return NextResponse.json(account, { status: 201 })
}
