import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const LevelSchema = z.object({
  level: z.enum(['critical', 'high', 'medium', 'low']),
  first_response_minutes: z.number().min(1),
  resolution_minutes: z.number().min(1),
  client_labels: z.array(z.string().min(1)).default([]),
})

const SLASchema = z.object({
  use_global_standard: z.boolean(),
  alert_threshold_pct: z.number().min(1).max(100).default(25),
  auto_close_hours: z.number().min(1).default(48),
  timezone: z.string().default('America/Sao_Paulo'),
  levels: z.array(LevelSchema).length(4),
})

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params
  const supabase = await getSupabaseServerClient()

  const { data: policy } = await supabase
    .from('sla_policies')
    .select('*, levels:sla_policy_levels(*), mappings:sla_level_mappings(*)')
    .eq('contract_id', contractId)
    .eq('is_global', false)
    .maybeSingle()

  if (!policy) return NextResponse.json(null)
  return NextResponse.json(policy)
}

// Upsert completo: policy + levels + mappings
export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id: contractId } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = SLASchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { levels, ...policyData } = parsed.data

  // Resolve account_id from contract
  const { data: contract } = await supabase
    .from('contracts')
    .select('account_id')
    .eq('id', contractId)
    .single()
  if (!contract) return NextResponse.json({ error: 'Contract not found' }, { status: 404 })

  // Upsert policy
  const { data: policy, error: policyError } = await supabase
    .from('sla_policies')
    .upsert(
      {
        contract_id: contractId,
        account_id: contract.account_id,
        is_global: false,
        is_active: true,
        ...policyData,
      },
      { onConflict: 'contract_id' }
    )
    .select('id')
    .single()

  if (policyError) return NextResponse.json({ error: policyError.message }, { status: 500 })

  const policyId = policy.id

  // Upsert levels
  const { error: levelsError } = await supabase
    .from('sla_policy_levels')
    .upsert(
      levels.map(l => ({
        policy_id: policyId,
        level: l.level,
        first_response_minutes: l.first_response_minutes,
        resolution_minutes: l.resolution_minutes,
      })),
      { onConflict: 'policy_id, level' }
    )

  if (levelsError) return NextResponse.json({ error: levelsError.message }, { status: 500 })

  // Replace mappings (delete + insert)
  await supabase.from('sla_level_mappings').delete().eq('policy_id', policyId)

  const allMappings = levels.flatMap(l =>
    l.client_labels.map(label => ({
      policy_id: policyId,
      external_label: label.trim(),
      internal_level: l.level,
    }))
  ).filter(m => m.external_label.length > 0)

  if (allMappings.length > 0) {
    const { error: mappingsError } = await supabase
      .from('sla_level_mappings')
      .insert(allMappings)
    if (mappingsError) return NextResponse.json({ error: mappingsError.message }, { status: 500 })
  }

  return NextResponse.json({ success: true, policy_id: policyId })
}
