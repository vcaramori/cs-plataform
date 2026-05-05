import { NextRequest, NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import {
  acceptCategorizationSuggestion,
  rejectCategorizationSuggestion,
  getLatestCategorizationSuggestion
} from '@/lib/support/categorization'

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

    const suggestion = await getLatestCategorizationSuggestion(ticketId)

    return NextResponse.json({
      suggestion
    })
  } catch (error) {
    console.error('[Categorization Suggestion GET] Error:', error)
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
      success = await acceptCategorizationSuggestion(
        ticketId,
        suggestionId,
        user.id
      )
    } else if (action === 'reject') {
      success = await rejectCategorizationSuggestion(
        ticketId,
        suggestionId,
        user.id
      )
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
    console.error('[Categorization Suggestion POST] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
