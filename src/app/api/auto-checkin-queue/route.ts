import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  // Fetch all queue items for the current CSM (pending and edited only)
  const { data: queueItems, error } = await supabase
    .from('auto_checkin_queue')
    .select(`
      *,
      account:accounts(id, name)
    `)
    .eq('csm_id', user.id)
    .in('status', ['pending', 'edited'])
    .order('created_at', { ascending: false })

  if (error) {
    console.error('Error fetching queue items:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(queueItems || [])
}
