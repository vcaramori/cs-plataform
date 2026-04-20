import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// GET /api/nps/goals — busca meta atual ou histórica
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { searchParams } = new URL(request.url)
    const dateStr = searchParams.get('date')
    const programId = searchParams.get('program_id')

    if (programId) {
      const { data: program, error: progError } = await supabase
        .from('nps_programs')
        .select('target_score')
        .eq('id', programId)
        .maybeSingle()
      
      if (progError) {
        console.error('[API/NPS/GOALS] Program fetch error:', progError)
      } else if (program?.target_score !== null && program?.target_score !== undefined) {
        return NextResponse.json({ goal_score: program.target_score, source: 'program' })
      }
    }

    const query = supabase.from('nps_global_goals').select('goal_score')
    if (dateStr) {
      const timestamp = Date.parse(dateStr)
      if (!isNaN(timestamp)) {
        const targetDate = new Date(timestamp).toISOString()
        query.lte('start_date', targetDate)
        query.or(`end_date.is.null,end_date.gt.${targetDate}`)
      }
    } else {
      query.is('end_date', null)
    }

    const { data: goal, error } = await query
      .order('created_at', { ascending: false })
      .limit(1)
      .maybeSingle()

    return NextResponse.json({ 
      goal_score: goal?.goal_score ?? 75, 
      source: goal ? 'global' : 'default' 
    })
  } catch (err) {
    console.error('[API/NPS/GOALS] GET error:', err)
    return NextResponse.json({ goal_score: 75, source: 'fallback' })
  }
}

// POST /api/nps/goals — define nova meta global
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { goal_score } = await request.json()
    if (typeof goal_score !== 'number') return NextResponse.json({ error: 'Invalid score' }, { status: 400 })

    const now = new Date().toISOString()
    await supabase.from('nps_global_goals').update({ end_date: now }).is('end_date', null)
    const { data, error } = await supabase.from('nps_global_goals').insert({ goal_score, start_date: now }).select().maybeSingle()

    if (error) throw error
    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API/NPS/GOALS] POST error:', err)
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 })
  }
}
