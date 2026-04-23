import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const FeatureSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  module: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = data.user

  const { data: featuresData, error } = await supabase
    .from('product_features')
    .select('*')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(featuresData)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = data.user

  const body = await request.json()
  const parsed = FeatureSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { data: newData, error } = await supabase
    .from('product_features')
    .insert(parsed.data)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(newData, { status: 201 })
}
