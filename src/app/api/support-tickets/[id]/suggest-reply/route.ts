import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  generateReplySuggestion,
  acceptReplySuggestion,
  rejectReplySuggestion,
  getLatestReplySuggestion
} from '@/lib/support/rag-reply-suggestion'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params

    // Validate ticket exists and is in valid status
    const { data: ticket, error: fetchError } = await supabase
      .from('support_tickets')
      .select('id, status')
      .eq('id', ticketId)
      .single()

    if (fetchError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      )
    }

    if (!['open', 'in_progress'].includes(ticket.status)) {
      return NextResponse.json(
        { error: 'Ticket must be open or in progress' },
        { status: 400 }
      )
    }

    // Get latest suggestion or generate new one
    let suggestion = await getLatestReplySuggestion(ticketId)

    if (!suggestion) {
      const result = await generateReplySuggestion(ticketId)
      suggestion = {
        suggestion_text: result.suggestion,
        confidence: result.confidence,
        sources: result.sources,
        model_used: result.modelUsed
      }
    }

    return NextResponse.json({
      suggestion: suggestion.suggestion_text,
      confidence: suggestion.confidence || 0,
      sources: suggestion.sources || [],
      modelUsed: suggestion.model_used || 'gemini-2.5-flash'
    })
  } catch (error) {
    console.error('[Suggest Reply GET] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: ticketId } = await params
    const { action, suggestionId } = await request.json()

    if (!action || !['accept', 'reject'].includes(action)) {
      return NextResponse.json(
        { error: 'Invalid action' },
        { status: 400 }
      )
    }

    if (!suggestionId) {
      return NextResponse.json(
        { error: 'Suggestion ID required' },
        { status: 400 }
      )
    }

    // Get current user
    const {
      data: { user },
      error: authError
    } = await supabase.auth.getUser()

    if (authError || !user) {
      return NextResponse.json(
        { error: 'Unauthorized' },
        { status: 401 }
      )
    }

    let success = false

    if (action === 'accept') {
      success = await acceptReplySuggestion(ticketId, suggestionId, user.id)
    } else if (action === 'reject') {
      success = await rejectReplySuggestion(ticketId, suggestionId, user.id)
    }

    if (!success) {
      return NextResponse.json(
        { error: 'Failed to process suggestion' },
        { status: 400 }
      )
    }

    return NextResponse.json({
      success: true,
      action,
      ticketId
    })
  } catch (error) {
    console.error('[Suggest Reply POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
