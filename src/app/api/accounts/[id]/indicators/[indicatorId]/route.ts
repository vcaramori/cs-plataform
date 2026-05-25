import { NextResponse } from 'next/server'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'

export async function DELETE(
  request: Request,
  { params }: { params: { id: string, indicatorId: string } }
) {
  try {
    const supabase = createClient(cookies())
    const { indicatorId } = params

    const { error } = await supabase
      .from('account_indicators')
      .delete()
      .eq('id', indicatorId)

    if (error) throw error

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error('Error deleting indicator:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
