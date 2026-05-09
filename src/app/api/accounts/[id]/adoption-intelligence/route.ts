import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Dummy adoption intelligence data for Wave 5 stub
    // Wave 6 will populate with real data from tracking
    const adoptionData = {
      adoption_score: 0.65,
      trend: 'stable',
      features_at_risk: [
        {
          feature: 'Advanced Reporting',
          adoption_pct: 30,
          drop_pct: -15,
          risk_level: 'high',
        },
        {
          feature: 'API Integration',
          adoption_pct: 45,
          drop_pct: -5,
          risk_level: 'medium',
        },
      ],
      heatmap_data: [
        { feature: 'Basic Features', week: '2026-W19', adoption_pct: 95 },
        { feature: 'Advanced Reporting', week: '2026-W19', adoption_pct: 30 },
        { feature: 'API Integration', week: '2026-W19', adoption_pct: 45 },
        { feature: 'Basic Features', week: '2026-W20', adoption_pct: 97 },
        { feature: 'Advanced Reporting', week: '2026-W20', adoption_pct: 28 },
        { feature: 'API Integration', week: '2026-W20', adoption_pct: 47 },
      ],
      blockers: [
        {
          blocker: 'Lack of training',
          count: 3,
          affected_features: ['Advanced Reporting'],
        },
        {
          blocker: 'Resource constraints',
          count: 2,
          affected_features: ['API Integration'],
        },
      ],
    }

    return NextResponse.json(adoptionData)
  } catch (error) {
    console.error('[adoption-intelligence] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
