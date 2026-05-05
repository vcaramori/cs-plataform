import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { BulkActionSchema, BulkActionResponse } from '@/lib/schemas/bulkAction.schema'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  try {
    const validated = BulkActionSchema.parse(body)

    // Verify ownership: all ticket_ids must belong to user's accounts
    const { data: tickets, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, status, assigned_to, accounts!inner(csm_owner_id)')
      .in('id', validated.ticket_ids)
      .eq('accounts.csm_owner_id', user.id)

    if (ticketError) {
      return NextResponse.json({ error: ticketError.message }, { status: 500 })
    }

    if (!tickets || tickets.length !== validated.ticket_ids.length) {
      return NextResponse.json(
        { error: 'Some tickets not found or not owned by you' },
        { status: 403 }
      )
    }

    // Store snapshot for undo
    const snapshot = tickets.map((t) => ({
      id: t.id,
      status: t.status,
      assigned_to: t.assigned_to,
    }))

    const errors: Array<{ ticket_id: string; reason: string }> = []
    let updated_count = 0

    // Execute action on each ticket
    for (const ticket of tickets) {
      try {
        const updateData: any = {}

        if (validated.action === 'change_status' && validated.payload.status) {
          updateData.status = validated.payload.status
        } else if (validated.action === 'assign' && 'assigned_to' in validated.payload) {
          updateData.assigned_to = validated.payload.assigned_to
        } else if (validated.action === 'close') {
          updateData.status = 'closed'
          updateData.closed_at = new Date().toISOString()
        }

        const { error: updateError } = await supabase
          .from('support_tickets')
          .update(updateData)
          .eq('id', ticket.id)

        if (updateError) {
          errors.push({ ticket_id: ticket.id, reason: updateError.message })
          continue
        }

        // Log event
        await supabase
          .from('ticket_events')
          .insert({
            ticket_id: ticket.id,
            event_type: `bulk_${validated.action}`,
            actor_id: user.id,
            payload: {
              action: validated.action,
              previous_status: ticket.status,
              new_status: updateData.status,
              previous_assigned_to: ticket.assigned_to,
              new_assigned_to: updateData.assigned_to,
            },
          })
          .select()

        updated_count++
      } catch (err) {
        errors.push({
          ticket_id: ticket.id,
          reason: err instanceof Error ? err.message : 'Unknown error',
        })
      }
    }

    const response: BulkActionResponse = {
      success: updated_count > 0,
      updated_count,
      snapshot,
    }

    if (errors.length > 0) {
      response.errors = errors
    }

    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request body', details: err.message },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

// Undo endpoint
export async function PUT(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const { snapshot } = body

  if (!Array.isArray(snapshot)) {
    return NextResponse.json({ error: 'Invalid snapshot' }, { status: 400 })
  }

  let restored_count = 0
  const errors: any[] = []

  // Restore each ticket
  for (const item of snapshot) {
    try {
      const { error } = await supabase
        .from('support_tickets')
        .update({
          status: item.status,
          assigned_to: item.assigned_to,
        })
        .eq('id', item.id)

      if (error) {
        errors.push({ ticket_id: item.id, reason: error.message })
        continue
      }

      // Log undo event
      await supabase
        .from('ticket_events')
        .insert({
          ticket_id: item.id,
          event_type: 'bulk_action_undone',
          actor_id: user.id,
          payload: { restored_status: item.status },
        })
        .select()

      restored_count++
    } catch (err) {
      errors.push({
        ticket_id: item.id,
        reason: err instanceof Error ? err.message : 'Unknown error',
      })
    }
  }

  return NextResponse.json({
    success: restored_count > 0,
    restored_count,
    errors: errors.length > 0 ? errors : undefined,
  })
}
