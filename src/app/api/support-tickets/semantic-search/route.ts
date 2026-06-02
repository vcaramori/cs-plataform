import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { searchEmbeddings } from '@/lib/supabase/vector-search'
import type { SupportTicket } from '@/lib/supabase/types'

const QuerySchema = z.object({
  query: z.string().min(3),
  limit: z.number().int().positive().default(20),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = QuerySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  try {
    const searchResults = await searchEmbeddings(parsed.data.query, {
      sourceType: 'support_ticket',
      limit: parsed.data.limit * 2,
      threshold: 0.35,
    })

    if (searchResults.length === 0) {
      return NextResponse.json({ tickets: [], query: parsed.data.query })
    }

    const ticketIds = searchResults.map(r => r.source_id)
    const scope = await getUserAccessScope(user.id, 'suporte')
    let ticketsQuery = supabase
      .from('support_tickets')
      .select('*, accounts!inner(name, csm_owner_id)')
      .in('id', ticketIds)
    if (scope !== 'global') ticketsQuery = ticketsQuery.eq('accounts.csm_owner_id', user.id)
    const { data: tickets, error } = await ticketsQuery

    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const scoredTickets = (tickets as (SupportTicket & { accounts?: any, similarity?: number })[]).map(t => ({
      ...t,
      similarity: searchResults.find(r => r.source_id === t.id)?.similarity ?? 0,
    }))

    const sorted = scoredTickets.sort((a, b) => (b.similarity ?? 0) - (a.similarity ?? 0))

    return NextResponse.json({ tickets: sorted.slice(0, parsed.data.limit), query: parsed.data.query })
  } catch (err: any) {
    console.error('[Semantic Search] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
