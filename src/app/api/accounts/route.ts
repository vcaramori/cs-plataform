import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const AccountSchema = z.object({
  client_name: z.string().min(2, 'Nome do cliente obrigatório'),
  account_name: z.string().min(2, 'Nome da conta obrigatório'),
  segment: z.enum(['SMB', 'Mid-Market', 'Enterprise']),
  csm_owner_id: z.string().uuid().optional(),
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
  logo_url: z.string().url().optional().or(z.literal('')),
  tax_id: z.string().optional().or(z.literal('')),
  mrr: z.number().positive().optional(),
  start_date: z.string().optional(),
  renewal_date: z.string().optional(),
})

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('accounts')
    .select(`
      *,
      clients (*),
      contracts (
        id, mrr, arr, renewal_date, status
      )
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

  // 1. Criar ou buscar o client
  let clientId: string

  const { data: existingClient } = await supabase
    .from('clients')
    .select('id')
    .ilike('name', parsed.data.client_name)
    .limit(1)
    .single()

  if (existingClient) {
    clientId = existingClient.id
  } else {
    const { data: newClient, error: clientErr } = await supabase
      .from('clients')
      .insert({
        name: parsed.data.client_name,
        industry: parsed.data.industry,
        website: parsed.data.website
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
      name: parsed.data.account_name,
      segment: parsed.data.segment,
      logo_url: parsed.data.logo_url || null,
      tax_id: parsed.data.tax_id || null,
      csm_owner_id: parsed.data.csm_owner_id || user.id
    })
    .select()
    .single()

  if (accountErr) return NextResponse.json({ error: accountErr.message }, { status: 500 })

  // 3. Criar o contrato inicial se os dados financeiros estiverem presentes
  if (parsed.data.mrr && parsed.data.start_date) {
    const { error: contractErr } = await supabase
      .from('contracts')
      .insert({
        account_id: account.id,
        mrr: parsed.data.mrr,
        arr: parsed.data.mrr * 12,
        start_date: parsed.data.start_date,
        renewal_date: parsed.data.renewal_date,
        status: 'active',
        contract_type: 'initial'
      })
    
    if (contractErr) {
      console.error('Error creating initial contract:', contractErr)
      // Não falha a criação da conta se o contrato falhar, mas logamos
    }
  }

  return NextResponse.json(account, { status: 201 })
}
