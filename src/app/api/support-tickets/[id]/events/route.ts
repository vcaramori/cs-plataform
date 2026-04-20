import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const supabase = await getSupabaseServerClient()
  const { id } = await params

  const { data: events, error } = await supabase
    .from('sla_events')
    .select('*')
    .eq('ticket_id', id)
    .order('occurred_at', { ascending: true })

  if (error) {
    return NextResponse.json({ error: 'Failed to fetch events' }, { status: 500 })
  }

  return NextResponse.json(events)
}
