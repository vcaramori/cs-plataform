import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { enrichTicketWithSLA, logSLAEvent } from '@/lib/support/lifecycle'
import { runPredictiveRiskAnalysis } from '@/lib/ai/predictive-risk'
import { FilterGroupSchema } from '@/lib/schemas/filter.schema'
import { applyFilterToQuery } from '@/lib/utils/filterQueryBuilder'
import { storeEmbeddings } from '@/lib/supabase/vector-search'

const TicketSchema = z.object({
  account_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().min(5),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'reopened']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.string().optional(),
  product: z.string().optional(),
  opened_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
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
  const filtersParam = searchParams.get('filters')

  // Busca apenas tickets de contas do CSM logado
  let query = supabase
    .from('support_tickets')
    .select('*, accounts!inner(name, csm_owner_id)')
    .eq('accounts.csm_owner_id', user.id)
    .order('opened_at', { ascending: false })
    .limit(100)

  // Legacy filters (F1-01 backward compat)
  if (accountId) query = query.eq('account_id', accountId)
  if (status) query = query.eq('status', status)
  if (priority) query = query.eq('priority', priority)

  // Complex filters (F1-02)
  if (filtersParam) {
    try {
      const filters = JSON.parse(decodeURIComponent(filtersParam))
      const validatedFilters = FilterGroupSchema.parse(filters)
      query = applyFilterToQuery(query, validatedFilters)
    } catch (err) {
      return NextResponse.json({ error: 'Invalid filters format' }, { status: 400 })
    }
  }

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

  // Trigger Predictive Risk AI em background sem bloquear o usuário
  runPredictiveRiskAnalysis(parsed.data.account_id).catch(err => {
    console.error('[Background AI] Error in predictive risk:', err)
  })

  // Ingest embedding para busca semântica (F1-04)
  storeEmbeddings(
    data.account_id,
    'support_ticket',
    data.id,
    `${data.title}\n${data.description ?? ''}`
  ).catch(err => {
    console.error('[Embeddings] store error:', err)
  })

  return NextResponse.json(data, { status: 201 })
}

