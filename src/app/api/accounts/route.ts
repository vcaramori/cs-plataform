import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const AccountSchema = z.object({
  client_name: z.string().min(2, 'Nome do cliente obrigatório'),
  account_name: z.string().min(2, 'Nome da conta obrigatório'),
  touch_model: z.enum(['High Touch', 'Mid Touch']),
  csm_owner_id: z.string().uuid().optional(), // opcional, se não vier usa o logado
  industry: z.string().optional(),
  website: z.string().url().optional().or(z.literal('')),
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
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

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
  const { data, error } = await supabase
    .from('accounts')
    .insert({
      client_id: clientId,
      name: parsed.data.account_name,
      touch_model: parsed.data.touch_model,
      csm_owner_id: parsed.data.csm_owner_id || user.id
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
