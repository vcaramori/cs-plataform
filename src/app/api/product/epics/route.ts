import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const EpicSchema = z.object({
  product_id: z.string().uuid(),
  name: z.string().min(1, 'Nome obrigatório'),
  color: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().default(true),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = EpicSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await (supabase as any).from('product_epics').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
