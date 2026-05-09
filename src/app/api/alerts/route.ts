import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const alertType = url.searchParams.get('alert_type') || 'predictive_churn'

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's CSM profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get CSM's accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, name, health_score')
      .eq('csm_owner_id', profile.id)

    // Generate dummy alerts for Wave 6 implementation
    const alerts = (accounts || [])
      .filter(a => a.health_score < 60)
      .slice(0, 5)
      .map((account, idx) => ({
        alert_id: `alert-${idx}`,
        account_id: account.id,
        account_name: account.name,
        alert_type: alertType,
        risk_score: Math.random() * 0.3 + 0.5,
        risk_factors: ['health_declining', 'nps_dropping', 'no_interaction_14d'].slice(0, 2),
        recommended_action: 'Schedule executive business review',
        created_at: new Date().toISOString(),
      }))

    return NextResponse.json({ alerts })
  } catch (error) {
    console.error('[alerts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
