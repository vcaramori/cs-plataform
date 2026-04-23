import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdateFeatureSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório').optional(),
  module: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
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

  const { data: updatedData, error } = await supabase
    .from('product_features')
    .update(parsed.data)
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(updatedData)
}
