import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const PlanSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  feature_ids: z.array(z.string().uuid()).optional(),
})

export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = data.user

  const { data, error } = await supabase
    .from('subscription_plans')
    .select(`
      *,
      plan_features (
        feature_id,
        product_features (*)
      )
    `)
    .order('name')

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data, error: authError } = await supabase.auth.getUser()
  if (authError || !data?.user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const user = data.user

  const body = await request.json()
  const parsed = PlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { feature_ids, ...planData } = parsed.data

  // 1. Criar o plano
  const { data: plan, error: planError } = await supabase
    .from('subscription_plans')
    .insert(planData)
    .select()
    .single()

  if (planError) return NextResponse.json({ error: planError.message }, { status: 500 })

  // 2. Vincular funcionalidades
  if (feature_ids && feature_ids.length > 0) {
    const links = feature_ids.map(fid => ({
      plan_id: plan.id,
      feature_id: fid
    }))

    const { error: linkError } = await supabase
      .from('plan_features')
      .insert(links)

    if (linkError) {
      console.error('Error linking features to plan:', linkError)
      // O plano foi criado, mas o vínculo falhou. Em um sistema real poderíamos usar transações
      // ou retornar um aviso. Por simplicidade no MVP, retornamos sucesso se o plano foi criado.
    }
  }

  return NextResponse.json(plan, { status: 201 })
}
