import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_briefings')
    .select('*')
    .eq('csm_id', user.id)
    .eq('date', today)
    .single()

  if (error && error.code !== 'PGRST116') {
    // PGRST116 = no rows found
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data || null)
}

export async function PATCH(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const body = await request.json()
  const { dismissed } = body

  const today = new Date().toISOString().split('T')[0]

  const { data, error } = await supabase
    .from('daily_briefings')
    .update({
      dismissed_at: dismissed ? new Date().toISOString() : null
    })
    .eq('csm_id', user.id)
    .eq('date', today)
    .select()
    .single()

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data)
}
