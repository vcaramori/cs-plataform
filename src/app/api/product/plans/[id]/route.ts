import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdatePlanSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional(),
  is_active: z.boolean().optional(),
  product_id: z.string().uuid().optional().nullable(),
  feature_ids: z.array(z.string().uuid()).optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = UpdatePlanSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { feature_ids, ...planData } = parsed.data
  const db = supabase as any

  if (Object.keys(planData).length > 0) {
    const { error } = await db.from('subscription_plans').update(planData).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  // Substitui o conjunto de funcionalidades quando enviado
  if (feature_ids) {
    await db.from('plan_features').delete().eq('plan_id', id)
    if (feature_ids.length > 0) {
      await db.from('plan_features').insert(feature_ids.map((fid: string) => ({ plan_id: id, feature_id: fid })))
    }
  }

  const { data, error } = await db.from('subscription_plans').select('*').eq('id', id).single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await (supabase as any).from('subscription_plans').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
