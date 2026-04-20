import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

export async function GET(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabaseServerClient()
  const { id } = params

  const { data, error } = await supabase
    .from('sla_level_mappings')
    .select('*')
    .eq('policy_id', id)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

const postSchema = z.object({
  external_label: z.string().min(1),
  internal_level: z.enum(['critical', 'high', 'medium', 'low'])
})

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = await getSupabaseServerClient()
  const { id } = params
  const body = await request.json()

  const parsed = postSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { data, error } = await supabase
    .from('sla_level_mappings')
    .insert([{
      policy_id: id,
      external_label: parsed.data.external_label,
      internal_level: parsed.data.internal_level
    }])
    .select()
    .single()

  if (error) {
    if (error.code === '23505') return NextResponse.json({ error: 'Mapping already exists for this label' }, { status: 409 })
    return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json(data, { status: 201 })
}
