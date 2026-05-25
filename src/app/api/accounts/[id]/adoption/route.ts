import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const UpdateAdoptionSchema = z.object({
  feature_id: z.string().uuid(),
  status: z.enum(['not_started', 'partial', 'in_use', 'blocked', 'na']).optional(),
  observation: z.string().optional().nullable(),
  blocker_category: z.enum(['data_integration', 'product_roadmap', 'people_process', 'governance', 'no_strategic_relevance', 'other']).optional().nullable(),
  blocker_reason: z.string().optional().nullable(),
  action_plan: z.string().optional().nullable(),
  action_owner: z.string().optional().nullable(),
  responsible_id: z.string().uuid().optional().nullable(),
  target_date: z.string().optional().nullable(),
  action_status: z.enum(['not_started', 'in_progress', 'completed', 'paused']).optional(),
  priority_level: z.enum(['low', 'medium', 'high']).optional(),
})

import { getAccountPlanSummary } from '@/lib/adoption/risk-engine'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // 1. Get active contracts and sync features automatically (self-healing)
  const { data: activeContracts } = await supabase
    .from('contracts')
    .select('id, service_type, contract_code, description')
    .eq('account_id', accountId)
    .eq('status', 'active')

  const activePlanNames = activeContracts?.map(c => c.service_type).filter(Boolean) || []

  let plans: any[] = []
  let planFeatures: any[] = []

  if (activePlanNames.length > 0) {
    const { data: fetchedPlans } = await supabase
      .from('subscription_plans')
      .select('id, name, tier_rank')
      .in('name', activePlanNames)

    plans = fetchedPlans || []

    if (plans.length > 0) {
      const planIds = plans.map(p => p.id)
      const { data: fetchedFeatures } = await supabase
        .from('plan_features')
        .select('plan_id, feature_id')
        .in('plan_id', planIds)

      planFeatures = fetchedFeatures || []

      if (planFeatures.length > 0) {
        const featureIds = planFeatures.map(f => f.feature_id)

        const { data: existingAdoption } = await supabase
          .from('feature_adoption')
          .select('feature_id')
          .eq('account_id', accountId)

        const existingIds = new Set(existingAdoption?.map(a => a.feature_id) || [])
        const missingFeatures = featureIds.filter(id => !existingIds.has(id))

        if (missingFeatures.length > 0) {
          const newInserts = missingFeatures.map(featureId => ({
            account_id: accountId,
            feature_id: featureId,
            status: 'not_started'
          }))

          await supabase
            .from('feature_adoption')
            .insert(newInserts)
        }
      }
    }
  }

  // 2. Get adoption records joined with feature details
  const { data: adoption, error: adoptionError } = await supabase
    .from('feature_adoption')
    .select(`
      *,
      product_features (*)
    `)
    .eq('account_id', accountId)

  if (adoptionError) return NextResponse.json({ error: adoptionError.message }, { status: 500 })

  // 3. Get Plan Summary and Downstream Risk via Shared Engine
  const planSummary = await getAccountPlanSummary(accountId, supabase)

  return NextResponse.json({
    adoption,
    plan_summary: planSummary,
    contracts: activeContracts || [],
    plans: plans || [],
    plan_features: planFeatures || []
  })
}

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: accountId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = UpdateAdoptionSchema.safeParse(body)
  if (!parsed.success) {
    console.error('[Adoption API] Validation Error:', parsed.error.format())
    return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  }

  const { feature_id, ...updateData } = parsed.data
  
  // Validação adicional: motico de bloqueio obrigatório se status for blocked
  if (updateData.status === 'blocked' && !updateData.blocker_reason?.trim()) {
    return NextResponse.json({ error: 'O motivo do bloqueio é obrigatório para o status Bloqueado.' }, { status: 400 })
  }

  const { data, error } = await supabase
    .from('feature_adoption')
    .update(updateData)
    .eq('account_id', accountId)
    .eq('feature_id', feature_id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
