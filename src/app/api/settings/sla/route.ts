import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const defaultLevels = [
  { level: 'critical', first_response_minutes: 30, resolution_minutes: 240 },
  { level: 'high', first_response_minutes: 120, resolution_minutes: 480 },
  { level: 'medium', first_response_minutes: 240, resolution_minutes: 1440 },
  { level: 'low', first_response_minutes: 480, resolution_minutes: 2880 },
]

export async function GET() {
  try {
    const adminClient = getSupabaseAdminClient()

    // 1. Fetch global policy using admin client to bypass RLS
    const { data, error } = await adminClient
      .from('sla_policies')
      .select(`
        *,
        levels:sla_policy_levels(*)
      `)
      .eq('is_global', true)
      .maybeSingle()

    // 2. Self-healing: if no global policy exists in database, seed it dynamically
    if (!data) {
      console.log('[API SLA Settings] Seeding default global SLA policy...')
      const { data: newPolicy, error: insertError } = await adminClient
        .from('sla_policies')
        .insert({
          is_global: true,
          alert_threshold_pct: 25,
          auto_close_hours: 48,
          timezone: 'America/Sao_Paulo'
        })
        .select()
        .single()

      if (insertError || !newPolicy) {
        console.error('[API SLA Settings] Seeding error:', insertError?.message)
        return NextResponse.json({ error: insertError?.message || 'Failed to seed global policy' }, { status: 500 })
      }

      const { error: levelsError } = await adminClient
        .from('sla_policy_levels')
        .insert(defaultLevels.map(l => ({ ...l, policy_id: newPolicy.id })))

      if (levelsError) {
        console.error('[API SLA Settings] Seeding levels error:', levelsError.message)
        return NextResponse.json({ error: levelsError.message }, { status: 500 })
      }

      // Fetch the newly seeded policy with levels
      const { data: seededData } = await adminClient
        .from('sla_policies')
        .select(`
          *,
          levels:sla_policy_levels(*)
        `)
        .eq('id', newPolicy.id)
        .single()

      return NextResponse.json(seededData)
    }

    return NextResponse.json(data)
  } catch (err: any) {
    console.error('[API SLA Settings] Unhandled GET error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
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
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    // Check permissions - only admin/super_admin/head_cs can configure global SLA settings
    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    const isAuthorized = ['admin', 'super_admin', 'head_cs'].includes(profile?.role || '')
    if (!isAuthorized) {
      return NextResponse.json({ error: 'Forbidden: Insufficient permissions.' }, { status: 403 })
    }

    const body = await request.json()
    const parsed = updateSchema.safeParse(body)
    if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

    const { levels, ...policyData } = parsed.data
    const adminClient = getSupabaseAdminClient()

    // 1. Get current global policy using admin client
    const { data: currentPolicy } = await adminClient
      .from('sla_policies')
      .select('id')
      .eq('is_global', true)
      .maybeSingle()

    let policyId = currentPolicy?.id

    // 2. If it doesn't exist, seed a new one
    if (!policyId) {
      const { data: newPolicy, error: insertError } = await adminClient
        .from('sla_policies')
        .insert({
          is_global: true,
          ...policyData
        })
        .select()
        .single()

      if (insertError || !newPolicy) {
        return NextResponse.json({ error: insertError?.message || 'Failed to create global policy' }, { status: 500 })
      }
      policyId = newPolicy.id
    } else {
      // Otherwise update existing policy
      const { error: policyError } = await adminClient
        .from('sla_policies')
        .update(policyData)
        .eq('id', policyId)

      if (policyError) return NextResponse.json({ error: policyError.message }, { status: 500 })
    }

    // 3. Update levels (delete and insert)
    await adminClient.from('sla_policy_levels').delete().eq('policy_id', policyId)
    
    const { error: levelsError } = await adminClient
      .from('sla_policy_levels')
      .insert(levels.map(l => ({ ...l, policy_id: policyId })))

    if (levelsError) return NextResponse.json({ error: levelsError.message }, { status: 500 })

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error('[API SLA Settings] Unhandled PUT error:', err)
    return NextResponse.json({ error: err.message || 'Internal server error' }, { status: 500 })
  }
}
