import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const ProductSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  key: z.string().optional().nullable(),
  color: z.string().optional().nullable(),
  sort_order: z.number().int().optional(),
  is_active: z.boolean().default(true),
})

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await (supabase as any)
    .from('products')
    .select('*, product_epics(*)')
    .order('sort_order')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // ordena épicos dentro de cada produto
  for (const p of data ?? []) {
    if (Array.isArray(p.product_epics)) {
      p.product_epics.sort((a: any, b: any) => (a.sort_order - b.sort_order) || a.name.localeCompare(b.name))
    }
  }
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: auth, error: authError } = await supabase.auth.getUser()
  if (authError || !auth?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = ProductSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await (supabase as any).from('products').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
