import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const AssignPlanSchema = z.object({
  plan_id: z.string().uuid(),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data, error } = await supabase
    .from('account_plans')
    .select(`
      *,
      subscription_plans (
        *,
        plan_features (
          feature_id,
          product_features (*)
        )
      )
    `)
    .eq('account_id', id)
    .single()

  if (error && error.code !== 'PGRST116') {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
  
  return NextResponse.json(data || null)
}

export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = AssignPlanSchema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  // Assign or update the plan
  const { data, error } = await supabase
    .from('account_plans')
    .upsert({
      account_id: accountId,
      plan_id: parsed.data.plan_id,
      is_active: true
    }, { onConflict: 'account_id' })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Initialize adoption records for features in this plan
  const { data: planFeatures } = await supabase
    .from('plan_features')
    .select('feature_id')
    .eq('plan_id', parsed.data.plan_id)

  if (planFeatures && planFeatures.length > 0) {
    const adoptionInserts = planFeatures.map(f => ({
      account_id: accountId,
      feature_id: f.feature_id,
      status: 'not_started'
    }))

    // Use upsert on conflict (account_id, feature_id) to avoid duplicates but ensure them exist
    await supabase
      .from('feature_adoption')
      .upsert(adoptionInserts, { onConflict: 'account_id,feature_id' })
  }

  return NextResponse.json(data)
}
