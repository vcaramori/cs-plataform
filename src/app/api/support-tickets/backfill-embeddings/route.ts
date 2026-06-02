import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { storeEmbeddings } from '@/lib/supabase/vector-search'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient()

    const scope = await getUserAccessScope(user.id, 'suporte')
    let ticketsQuery = supabase
      .from('support_tickets')
      .select('id, account_id, title, description, accounts!inner(csm_owner_id)')
    if (scope !== 'global') ticketsQuery = ticketsQuery.eq('accounts.csm_owner_id', user.id)
    const { data: tickets, error: ticketError } = await ticketsQuery

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    if (!tickets || tickets.length === 0) {
      return NextResponse.json({ processed: 0, skipped: 0, message: 'No tickets found' })
    }

    const { data: existing, error: existingError } = await (admin as any)
      .from('embeddings')
      .select('source_id')
      .eq('source_type', 'support_ticket')
      .in('source_id', tickets.map(t => t.id))

    if (existingError) {
      return NextResponse.json({ error: existingError.message }, { status: 500 })
    }

    const existingIds = new Set((existing ?? []).map((e: any) => e.source_id))
    const toProcess = tickets.filter((t: any) => !existingIds.has(t.id))

    let processed = 0
    let failed = 0

    for (const ticket of toProcess) {
      try {
        await storeEmbeddings(
          ticket.account_id,
          'support_ticket',
          ticket.id,
          `${ticket.title}\n${ticket.description ?? ''}`
        )
        processed++
      } catch (err) {
        console.error(`[Backfill] Failed for ticket ${ticket.id}:`, err)
        failed++
      }
    }

    return NextResponse.json({
      processed,
      skipped: existingIds.size,
      failed,
      total: tickets.length,
    })
  } catch (err: any) {
    console.error('[Backfill Embeddings] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
