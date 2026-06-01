import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdateProductSchema = z.object({
  name: z.string().min(2).optional(),
  key: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = UpdateProductSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await (supabase as any).from('products').update(parsed.data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { error } = await (supabase as any).from('products').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ success: true })
}
