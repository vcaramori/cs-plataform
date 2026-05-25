import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function POST(
  request: Request,
  { params }: { params: { id: string, indicatorId: string } }
) {
  try {
    const supabase = createClient(cookies())
    const { indicatorId } = params
    const body = await request.json()

    const { value, date, notes, source_type } = body

    if (value === undefined || !date) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    // Insert history record
    const { error: historyError } = await supabase
      .from('account_indicator_history')
      .insert([
        {
          indicator_id: indicatorId,
          value,
          date,
          notes: notes || null,
          source_type: source_type || 'manual'
        }
      ])

    if (historyError) throw historyError

    // Update current value on the main indicator record
    const { error: updateError } = await supabase
      .from('account_indicators')
      .update({ current_value: value, updated_at: new Date().toISOString() })
      .eq('id', indicatorId)

    if (updateError) throw updateError

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error adding indicator history:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
