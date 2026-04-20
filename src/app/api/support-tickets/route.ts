import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { enrichTicketWithSLA, logSLAEvent } from '@/lib/support/lifecycle'

const TicketSchema = z.object({
  account_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().min(5),
  status: z.enum(['open', 'in-progress', 'resolved', 'closed']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.string().optional(),
  opened_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  resolved_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  external_ticket_id: z.string().optional(),
})

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const accountId = searchParams.get('account_id')
  const status = searchParams.get('status')
  const priority = searchParams.get('priority')

  // Busca apenas tickets de contas do CSM logado
  let query = supabase
    .from('support_tickets')
    .select('*, accounts!inner(name, csm_owner_id)')
    .eq('accounts.csm_owner_id', user.id)
    .order('opened_at', { ascending: false })
    .limit(100)

  if (accountId) query = query.eq('account_id', accountId)
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  const { data, error } = await query
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = TicketSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Valida ownership da conta
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', parsed.data.account_id)
    .eq('csm_owner_id', user.id)
    .single()

  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  const enrichedPayload = await enrichTicketWithSLA({ ...parsed.data, source: 'manual' })

  const { data, error } = await supabase
    .from('support_tickets')
    .insert(enrichedPayload)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Log creation event asynchronously
  logSLAEvent(data.id, 'ticket_created', { source: 'manual', assigned_priority: data.internal_level }).catch(console.error)

  return NextResponse.json(data, { status: 201 })
}

