import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { TerritoryRebalancerResponseSchema, ExecuteRebalancingRequestSchema } from '@/lib/schemas/csOps.schema'
import { CSOperationsService } from '@/lib/cs-ops/cs-ops-service'

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Only csm_senior and admin can see rebalancing suggestions
    if (!['csm_senior', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = new CSOperationsService(supabase)
    const suggestions = await service.suggestRebalancing()

    const validated = TerritoryRebalancerResponseSchema.safeParse(suggestions)
    if (!validated.success) {
      console.error('[cs-ops/rebalancer] Schema error:', validated.error)
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error('[cs-ops/rebalancer] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = ExecuteRebalancingRequestSchema.safeParse(body)

    if (!params.success) {
      return NextResponse.json({ error: params.error.flatten() }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('auth_id', user.id)
      .single()

    if (!profile || !['csm_senior', 'admin'].includes(profile.role)) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    // Execute rebalancing (mark as approved and update account assignments)
    const { data: suggestions } = await supabase
      .from('territory_rebalancing')
      .select('id, from_csm_id, to_csm_id, account_id')
      .in('id', params.data.suggestionIds)
      .eq('status', 'proposed')

    for (const suggestion of suggestions || []) {
      // Update account CSM owner
      await supabase
        .from('accounts')
        .update({ csm_owner_id: suggestion.to_csm_id })
        .eq('id', suggestion.account_id)

      // Mark suggestion as executed
      await supabase
        .from('territory_rebalancing')
        .update({
          status: 'executed',
          executed_at: new Date().toISOString(),
          approved_by: profile.id,
        })
        .eq('id', suggestion.id)
    }

    return NextResponse.json({ success: true, executedCount: suggestions?.length || 0 }, { status: 200 })
  } catch (error) {
    console.error('[cs-ops/rebalancer] POST Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
