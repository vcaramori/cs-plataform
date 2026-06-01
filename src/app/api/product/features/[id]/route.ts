import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdateFeatureSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').optional(),
  module: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  epic_ids: z.array(z.string().uuid()).optional(),
})

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = data.user

  const { error } = await supabase
    .from('product_features')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = data.user

  const body = await request.json()
  const parsed = UpdateFeatureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { epic_ids, ...featureData } = parsed.data
  const { data: updatedData, error } = await supabase
    .from('product_features')
    .update(featureData)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // de→para Funcionalidade → Épico: substitui o conjunto quando enviado
  if (epic_ids) {
    const db = supabase as any
    await db.from('feature_epics').delete().eq('feature_id', id)
    if (epic_ids.length > 0) {
      await db.from('feature_epics').insert(epic_ids.map((epic_id: string) => ({ feature_id: id, epic_id })))
    }
  }

  return NextResponse.json(updatedData)
}
