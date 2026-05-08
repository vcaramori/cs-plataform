import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const NegotiationHistorySchema = z.object({
  date: z.string().datetime().optional(),
  discount_offered_pct: z.number().min(0).max(100).optional(),
  discount_accepted_pct: z.number().min(0).max(100).optional(),
  main_objection: z.string().optional(),
  closing_argument: z.string().optional(),
  counterpart_name: z.string().optional(),
  counterpart_role: z.string().optional(),
  outcome: z.enum(['renewed', 'lost', 'pending']).optional(),
  notes: z.string().optional(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from('contract_negotiation_history')
    .select('*')
    .eq('contract_id', id)
    .order('date', { ascending: false })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch contract to get account_id
  const { data: contract, error: contractError } = await supabase
    .from('contracts')
    .select('account_id')
    .eq('id', id)
    .single()

  if (contractError || !contract) {
    return NextResponse.json({ error: 'Contract not found' }, { status: 404 })
  }

  // Verify ownership
  const { data: account } = await supabase
    .from('accounts')
    .select('csm_owner_id')
    .eq('id', contract.account_id)
    .single()

  if (account?.csm_owner_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  try {
    const body = await request.json()
    const validated = NegotiationHistorySchema.parse(body)

    const { data, error } = await supabase
      .from('contract_negotiation_history')
      .insert({
        contract_id: id,
        account_id: contract.account_id,
        created_by: user.id,
        ...validated
      })
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data, { status: 201 })
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 400 })
  }
}
