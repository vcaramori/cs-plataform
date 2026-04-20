import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

export async function GET() {
  const supabase = await getSupabaseServerClient()

  const { data, error } = await supabase
    .from('sla_policies')
    .select(`
      *,
      levels:sla_policy_levels(*)
    `)
    .eq('is_global', true)
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}

const updateSchema = z.object({
  alert_threshold_pct: z.number().min(1).max(100),
  auto_close_hours: z.number().min(1),
  timezone: z.string(),
  levels: z.array(z.object({
    level: z.enum(['critical', 'high', 'medium', 'low']),
    first_response_minutes: z.number().min(0),
    resolution_minutes: z.number().min(0)
  }))
})

export async function PUT(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = updateSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { levels, ...policyData } = parsed.data

  // 1. Get current global policy
  const { data: currentPolicy } = await supabase
    .from('sla_policies')
    .select('id')
    .eq('is_global', true)
    .single()

  if (!currentPolicy) return NextResponse.json({ error: 'Global policy not found' }, { status: 404 })

  // 2. Update policy
  const { error: policyError } = await supabase
    .from('sla_policies')
    .update(policyData)
    .eq('id', currentPolicy.id)

  if (policyError) return NextResponse.json({ error: policyError.message }, { status: 500 })

  // 3. Update levels (simple delete and insert for global policy)
  await supabase.from('sla_policy_levels').delete().eq('policy_id', currentPolicy.id)
  
  const { error: levelsError } = await supabase
    .from('sla_policy_levels')
    .insert(levels.map(l => ({ ...l, policy_id: currentPolicy.id })))

  if (levelsError) return NextResponse.json({ error: levelsError.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
