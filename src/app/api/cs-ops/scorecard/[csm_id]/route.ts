import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ csm_id: string }> }
) {
  try {
    const { csm_id } = await params
    const supabase = (await getSupabaseServerClient()) as any;
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get CSM profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, name')
      .eq('id', csm_id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'CSM not found' }, { status: 404 })
    }

    // Get accounts managed by CSM
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, health_score')
      .eq('csm_owner_id', csm_id)

    const accountsManaged = accounts?.length || 0
    const avgHealth = accounts && accounts.length > 0
      ? Math.round(accounts.reduce((sum, a) => sum + (a.health_score || 0), 0) / accounts.length)
      : 0

    // Dummy data for Wave 6 implementation
    return NextResponse.json({
      csm_id,
      csm_name: profile.name,
      accounts_managed: accountsManaged,
      avg_health: avgHealth / 100,
      avg_nps: 7.2,
      capacity_utilization: 0.85,
      health_escalations_resolved_pct: 0.92,
      avg_csat: 0.88,
      avg_trt_hours: 4.5,
      interactions_per_account: 2.3,
    })
  } catch (error) {
    console.error('[cs-ops/scorecard] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
