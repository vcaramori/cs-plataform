import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = createAdminClient()

  // Fetch resolved/closed tickets with CSAT responses not yet vectorized
  const { data: tickets, error } = await admin
    .from('support_tickets')
    .select(`
      id,
      account_id,
      title,
      description,
      resolved_at,
      is_vectorized,
      accounts!inner(name, csm_owner_id),
      csat_responses(score, comment, answered_at)
    `)
    .in('status', ['resolved', 'closed'])
    .eq('is_vectorized', false)
    .eq('accounts.csm_owner_id', user.id)
    .not('csat_responses', 'is', null)
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  let ingested = 0
  let failed = 0

  for (const ticket of tickets ?? []) {
    const csat = (ticket.csat_responses as any[])?.[0]
    if (!csat) continue

    const accountName = (ticket.accounts as any)?.name ?? 'Cliente'
    const scoreText = csat.score ? `${csat.score}/5` : 'sem avaliação'
    const commentText = csat.comment ? `Comentário: ${csat.comment}` : 'Sem comentário'

    const chunk = `[CSAT - ${accountName}] Resolução: ${ticket.description?.slice(0, 500) ?? ticket.title}. Avaliação: ${scoreText}. ${commentText}`

    try {
      await storeEmbeddings(ticket.account_id, 'support_ticket', ticket.id, chunk)
      await admin.from('support_tickets').update({ is_vectorized: true }).eq('id', ticket.id)
      ingested++
    } catch {
      failed++
    }
  }

  return NextResponse.json({ ingested, failed, ran_at: new Date().toISOString() })
}
