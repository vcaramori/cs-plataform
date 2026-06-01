import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const DismissSchema = z.object({
  action: z.enum(['dismiss']),
  candidate_id: z.string().uuid()
})

/**
 * GET /api/support-tickets/[id]/similarity-candidates
 * Fetch similarity candidates for a ticket
 */
export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    // Fetch candidates for this ticket (both directions)
    const { data: candidates, error } = await supabase
      .from('ticket_similarity_candidates')
      .select(`
        id,
        ticket_a_id,
        ticket_b_id,
        similarity_score,
        status,
        reviewed_by,
        reviewed_at
      `)
      .or(`ticket_a_id.eq.${id},ticket_b_id.eq.${id}`)
      .eq('status', 'pending_review')

    if (error) {
      console.error('[Similarity Candidates] Error fetching:', error)
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    // Fetch the other ticket titles for context
    const otherTicketIds = candidates
      ?.map(c => c.ticket_a_id === id ? c.ticket_b_id : c.ticket_a_id)
      .filter(Boolean) || []

    let otherTickets: any[] = []
    if (otherTicketIds.length > 0) {
      const { data: tickets } = await supabase
        .from('support_tickets')
        .select('id, title')
        .in('id', otherTicketIds)

      otherTickets = tickets || []
    }

    // Enrich candidates with titles
    const enriched = candidates?.map(c => {
      const otherTicketId = c.ticket_a_id === id ? c.ticket_b_id : c.ticket_a_id
      const otherTicket = otherTickets.find(t => t.id === otherTicketId)

      return {
        id: c.id,
        ticket_a_id: c.ticket_a_id,
        ticket_b_id: c.ticket_b_id,
        similarity_score: c.similarity_score,
        other_ticket_id: otherTicketId,
        other_ticket_title: otherTicket?.title
      }
    }) || []

    return NextResponse.json({ candidates: enriched })
  } catch (err) {
    console.error('[Similarity Candidates GET] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/support-tickets/[id]/similarity-candidates
 * Dismiss a similarity candidate (false positive)
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()

  // Get current user
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const body = await request.json()
    const parsed = DismissSchema.safeParse(body)

    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.format() }, { status: 400 })
    }

    const { candidate_id } = parsed.data

    // Update candidate as dismissed
    const { error: updateErr } = await admin
      .from('ticket_similarity_candidates')
      .update({
        status: 'dismissed',
        reviewed_by: user.id,
        reviewed_at: new Date().toISOString()
      })
      .eq('id', candidate_id)

    if (updateErr) {
      return NextResponse.json({ error: updateErr.message }, { status: 500 })
    }

    return NextResponse.json({ success: true })
  } catch (err) {
    console.error('[Similarity Candidates POST] Error:', err)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
