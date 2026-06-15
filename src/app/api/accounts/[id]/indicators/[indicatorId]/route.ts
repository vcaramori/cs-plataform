import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

// Campos editáveis de uma meta (indicador). Permite, entre outros, definir a
// data-alvo de metas antigas que nasceram sem ela.
const EDITABLE_FIELDS = ['name', 'target_value', 'unit', 'target_date', 'icon', 'color'] as const

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string, indicatorId: string }> }
) {
  try {
    const { indicatorId } = await params
    const supabase = await getSupabaseServerClient()
    const body = await request.json()

    const updateData: Record<string, any> = { updated_at: new Date().toISOString() }
    for (const key of EDITABLE_FIELDS) {
      if (body[key] !== undefined) updateData[key] = body[key]
    }
    // Permite limpar a data-alvo enviando string vazia
    if (body.target_date === '') updateData.target_date = null

    const { data, error } = await supabase
      .from('account_indicators')
      .update(updateData)
      .eq('id', indicatorId)
      .select()
      .single()

    if (error) throw error

    return NextResponse.json(data)
  } catch (error: any) {
    console.error('Error updating indicator:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

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
