import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { enrichTicketWithSLA, logSLAEvent, openTicket } from '@/lib/support/lifecycle'
import { sendTicketAcknowledgment } from '@/lib/support/email-sender'
import { runPredictiveRiskAnalysis } from '@/lib/ai/predictive-risk'
import { FilterGroupSchema } from '@/lib/schemas/filter.schema'
import { applyFilterToQuery } from '@/lib/utils/filterQueryBuilder'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { processAutoCategorizationForTicket } from '@/lib/support/categorization'

const TicketSchema = z.object({
  account_id: z.string().uuid(),
  title: z.string().min(3),
  description: z.string().min(5),
  status: z.enum(['open', 'in_progress', 'resolved', 'closed', 'reopened']).default('open'),
  priority: z.enum(['low', 'medium', 'high', 'critical']).default('medium'),
  category: z.string().optional().nullable(),
  product: z.string().optional(),
  opened_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  resolved_at: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional(),
  external_ticket_id: z.string().optional().nullable(),
  client_email: z.string().optional().nullable(),
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
  console.log('[API POST] Received ticket creation request')
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) {
    console.log('[API POST] Unauthorized user')
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  console.log('[API POST] Parsing request body:', body)
  const parsed = TicketSchema.safeParse(body)
  if (!parsed.success) {
    console.log('[API POST] Schema validation failed:', parsed.error.flatten())
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // 1. Validação flexível baseada em privilégios (CSM comum vs Admin/Head)
  console.log('[API POST] Checking user profile role for user:', user.id)
  const { data: profile } = await supabase
    .from('profiles')
    .select('role')
    .eq('id', user.id)
    .single()

  const isAdminOrHead = profile?.role === 'admin' || profile?.role === 'super_admin' || profile?.role === 'head_cs'
  console.log('[API POST] Profile role:', profile?.role, 'isAdminOrHead:', isAdminOrHead)

  let accountQuery = supabase
    .from('accounts')
    .select('id')
    .eq('id', parsed.data.account_id)

  if (!isAdminOrHead) {
    accountQuery = accountQuery.eq('csm_owner_id', user.id)
  }

  const { data: account } = await accountQuery.single()
  if (!account) {
    console.log('[API POST] Account not found or no permission for ID:', parsed.data.account_id)
    return NextResponse.json({ error: 'Conta não encontrada ou sem permissão.' }, { status: 404 })
  }

  // 2. Extrair dados adicionais não salvos diretamente e enriquecer com SLA
  const { client_email, ...ticketData } = parsed.data
  const openedAtStr = ticketData.opened_at || new Date().toISOString().split('T')[0]
  const fullTicketData = {
    ...ticketData,
    opened_at: openedAtStr
  }
  console.log('[API POST] Enriching ticket with SLA policies...')
  const enrichedPayload = await enrichTicketWithSLA({ ...fullTicketData, source: 'manual' })
  console.log('[API POST] Ticket enriched with SLA. Insert payload:', enrichedPayload)

  // 3. Salvar chamado no Banco de Dados
  console.log('[API POST] Saving support ticket in the DB...')
  const { data, error } = await supabase
    .from('support_tickets')
    .insert(enrichedPayload)
    .select()
    .single()

  if (error) {
    console.log('[API POST] Save error:', error.message)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  console.log('[API POST] Ticket saved successfully. Data:', data)

  // 4. Se external_ticket_id não fornecido, gera um com o prefixo curto do UUID e atualiza
  let finalExternalId = data.external_ticket_id
  if (!finalExternalId) {
    finalExternalId = data.id.split('-')[0].toUpperCase()
    const { data: updatedTicket } = await supabase
      .from('support_tickets')
      .update({ external_ticket_id: finalExternalId })
      .eq('id', data.id)
      .select()
      .single()
    if (updatedTicket) {
      data.external_ticket_id = updatedTicket.external_ticket_id
    }
  }

  // 5. Iniciar fluxo de ciclo de vida operacional (atribuição automática, score de urgência IA e notificações)
  openTicket(data.id).catch(console.error)

  // Log creation event asynchronously
  logSLAEvent(data.id, 'ticket_created', { source: 'manual', assigned_priority: data.internal_level }).catch(console.error)

  // 6. Enviar e-mail de notificação ao cliente em segundo plano se informado
  if (client_email) {
    const adminClient = getSupabaseAdminClient()
    ;(adminClient as any)
      .from('app_settings')
      .select('value')
      .eq('key', 'support_email_integration')
      .single()
      .then(({ data: dbSettingsRow }: any) => {
        const emailSettings = dbSettingsRow?.value || {}
        sendTicketAcknowledgment(
          { id: data.id, external_ticket_id: data.external_ticket_id || finalExternalId, title: data.title },
          emailSettings,
          client_email,
          data.title
        )
      })
      .catch((err: any) => {
        console.error('[Email] Failed to fetch settings and send acknowledgment:', err)
      })
  }

  // 7. Processos complementares em segundo plano
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

  // Auto-categorize ticket (F1-18)
  processAutoCategorizationForTicket(
    data.id,
    data.title,
    data.description,
    data.category
  ).catch(err => {
    console.error('[Auto-Categorize] Background error:', err)
  })

  return NextResponse.json(data, { status: 201 })
}


