import { NextResponse } from 'next/server'
import { createClient } from '../../../../lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = createClient()
  const { id } = await params

  const { data: ticket, error } = await supabase
    .from('support_tickets')
    .select(`
      id,
      internal_level,
      external_priority_label,
      sla_policy_id,
      first_response_deadline,
      first_response_at,
      sla_status_first_response,
      sla_breach_first_response,
      resolution_deadline,
      resolved_at,
      sla_status_resolution,
      sla_breach_resolution
    `)
    .eq('id', id)
    .single()

  if (error || !ticket) {
    return NextResponse.json({ error: 'Ticket not found' }, { status: 404 })
  }

  // Calculate remaining and elapsed minutes purely based on basic time diff (visual only)
  // For precise visual countdowns, the Frontend `<SLATimer />` uses the absolute `deadline` timestamp 
  // rather than a stale minute count from the server.
  // The spec requires this endpoint to serve the aggregated contract.
  
  const now = new Date().getTime()
  
  const getSLAObj = (deadlineStr: string | null, statusStr: string | null, breach: boolean, completedAtStr: string | null) => {
    if (!deadlineStr) return null
    const deadline = new Date(deadlineStr).getTime()
    const isCompleted = !!completedAtStr
    const completedAt = completedAtStr ? new Date(completedAtStr).getTime() : now
    
    // Elapsed vs Remaining calculation is physical time for the JSON response
    // (Actual SLA business minutes remain strictly an engine construct during `openTicket`)
    const elapsedMinutes = Math.floor((completedAt - (isCompleted ? completedAt : now)) / 60000) 
    const remainingMinutes = Math.floor((deadline - now) / 60000)

    return {
      deadline: deadlineStr,
      elapsed_minutes: Math.max(0, elapsedMinutes),
      remaining_minutes: isCompleted ? 0 : remainingMinutes,
      status: statusStr,
      met: isCompleted ? !breach : null
    }
  }

  return NextResponse.json({
    ticket_id: ticket.id,
    internal_level: ticket.internal_level,
    external_label: ticket.external_priority_label,
    policy_id: ticket.sla_policy_id,
    first_response: getSLAObj(ticket.first_response_deadline, ticket.sla_status_first_response, ticket.sla_breach_first_response, ticket.first_response_at),
    resolution: getSLAObj(ticket.resolution_deadline, ticket.sla_status_resolution, ticket.sla_breach_resolution, ticket.resolved_at)
  })
}
