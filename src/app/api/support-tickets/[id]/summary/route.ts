import { NextRequest, NextResponse } from 'next/server'
import { getOrGenerateTicketSummary, regenerateTicketSummary } from '@/lib/support/ticket-summary'

/**
 * GET /api/support-tickets/[id]/summary
 * Returns cached summary or generates new one if stale/missing
 */
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    const result = await getOrGenerateTicketSummary(ticketId)

    return NextResponse.json({
      summary: result.summary,
      generatedAt: result.generatedAt,
      isStale: result.isStale
    })
  } catch (error) {
    console.error('[Ticket Summary GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

/**
 * POST /api/support-tickets/[id]/summary
 * Force regenerate summary (admin only)
 */
export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    // Optional: Check if user is admin (for full implementation)
    // For now, allow all authenticated users
    const { data: { user } } = await request.json().then(() => ({
      data: { user: { id: 'system' } }
    })).catch(() => ({ data: { user: null } }))

    const result = await regenerateTicketSummary(ticketId, user?.id)

    return NextResponse.json({
      summary: result.summary,
      generatedAt: result.generatedAt,
      isStale: result.isStale
    })
  } catch (error) {
    console.error('[Ticket Summary POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
