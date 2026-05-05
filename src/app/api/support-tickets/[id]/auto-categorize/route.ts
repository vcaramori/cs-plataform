import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { processAutoCategorizationForTicket } from '@/lib/support/categorization'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    // Fetch ticket
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
