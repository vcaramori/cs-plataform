import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string, indicatorId: string }> }
) {
  try {
    const { indicatorId } = await params
    const supabase = await getSupabaseServerClient()

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
