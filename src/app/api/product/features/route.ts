import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const FeatureSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  module: z.string().optional(),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  epic_ids: z.array(z.string().uuid()).optional(),
})

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: featuresData, error } = await (supabase as any)
    .from('product_features')
    .select('*, feature_epics(epic_id)')
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  // achata epic_ids para facilitar o consumo na UI
  const out = (featuresData ?? []).map((f: any) => ({
    ...f,
    epic_ids: (f.feature_epics ?? []).map((fe: any) => fe.epic_id),
  }))
  return NextResponse.json(out)
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

  const { epic_ids, ...featureData } = parsed.data
  const { data: newData, error } = await supabase
    .from('product_features')
    .insert(featureData)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // de→para Funcionalidade → Épico
  if (epic_ids && epic_ids.length > 0) {
    await (supabase as any)
      .from('feature_epics')
      .insert(epic_ids.map((epic_id: string) => ({ feature_id: newData.id, epic_id })))
  }

  return NextResponse.json(newData, { status: 201 })
}
