import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params
    const supabase = await getSupabaseServerClient()
    const { data, error } = await supabase
      .from('account_indicators')
      .select(`
        *,
        history:account_indicator_history(*)
      `)
      .eq('account_id', accountId)
      .order('created_at', { ascending: true })

    if (error) throw error

    // Sort history by date ascending inside each indicator
    const formattedData = data.map(ind => ({
      ...ind,
      history: ind.history.sort((a: any, b: any) => new Date(a.date).getTime() - new Date(b.date).getTime())
    }))

    return NextResponse.json({ indicators: formattedData })
  } catch (error: any) {
    console.error('Error fetching indicators:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const { name, target_value, unit, icon, color } = body

    if (!name || target_value === undefined) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const { data, error } = await supabase
      .from('account_indicators')
      .insert([
        {
          account_id: accountId,
          name,
          target_value,
          unit: unit || '',
          icon: icon || 'Activity',
          color: color || 'blue',
          current_value: 0
        }
      ])
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error creating indicator:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
