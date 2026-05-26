import { NextRequest, NextResponse } from 'next/server'
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { processAutoCategorizationForTicket } from '@/lib/support/categorization'

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth()
    if (isAuthError(auth)) return auth

    const supabase = getSupabaseAdminClient()
    const { id: ticketId } = await params

    const { data: ticket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('id, title, description, category')
      .eq('id', ticketId)
      .single()

    if (fetchError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    // Process categorization
    const result = await processAutoCategorizationForTicket(
      ticketId,
      ticket.title,
      ticket.description,
      ticket.category
    )

    return NextResponse.json({
      success: true,
      applied: result.applied,
      suggestion: result.suggestion
    })
  } catch (error) {
    console.error('[Auto-Categorize] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
