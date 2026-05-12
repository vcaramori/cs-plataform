import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const BriefingSchema = z.object({
  briefing_text: z.string(),
  date: z.string(),
  csm_id: z.string().uuid(),
  portfolio_health_avg: z.number().min(0).max(100),
  trend_7d: z.array(z.object({
    date: z.string(),
    health: z.number().min(0).max(100),
  })),
})

type Briefing = z.infer<typeof BriefingSchema>

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's CSM profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get CSM-owned accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, health_score')
      .eq('csm_owner_id', profile.id)

    if (!accounts || accounts.length === 0) {
      const fallbackBriefing: Briefing = {
        briefing_text: 'Your portfolio is stable. Monitor critical accounts.',
        date: new Date().toISOString().split('T')[0],
        csm_id: profile.id,
        portfolio_health_avg: 0,
        trend_7d: [],
      }
      return NextResponse.json(fallbackBriefing)
    }

    // Calculate portfolio health average
    const portfolioHealthAvg = Math.round(
      accounts.reduce((sum, a) => sum + (a.health_score || 0), 0) / accounts.length
    )

    // Get 7-day health trend
    const sevenDaysAgo = new Date()
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)

    const { data: healthTrends } = await supabase
      .from('health_scores')
      .select('calculated_at, health_score_v2')
      .in('account_id', accounts.map(a => a.id))
      .gte('calculated_at', sevenDaysAgo.toISOString())
      .order('calculated_at', { ascending: true })

    // Group by date and calculate average
    const trendByDate = new Map<string, number[]>()
    for (const trend of healthTrends || []) {
      const date = trend.calculated_at?.split('T')[0] || ''
      if (!trendByDate.has(date)) {
        trendByDate.set(date, [])
      }
      const dateScores = trendByDate.get(date)
      if (dateScores) {
        dateScores.push(trend.health_score_v2 || 0)
      }
    }

    const trend7d = Array.from(trendByDate.entries())
      .map(([date, scores]) => ({
        date,
        health: Math.round(scores.reduce((a, b) => a + b, 0) / scores.length),
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const briefing: Briefing = {
      briefing_text: generateBriefingText(portfolioHealthAvg),
      date: new Date().toISOString().split('T')[0],
      csm_id: profile.id,
      portfolio_health_avg: portfolioHealthAvg,
      trend_7d: trend7d,
    }

    return NextResponse.json(briefing)
  } catch (error) {
    console.error('[daily-briefing] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}

function generateBriefingText(healthAvg: number): string {
  if (healthAvg >= 75) {
    return 'Your portfolio is performing well. Focus on expansion opportunities with top accounts.'
  }
  if (healthAvg >= 60) {
    return 'Portfolio is stable. Monitor accounts below 50 health and plan interventions.'
  }
  if (healthAvg >= 40) {
    return 'Portfolio needs attention. Prioritize health recovery for critical accounts.'
  }
  return 'Your portfolio requires immediate action. Critical accounts need intervention.'
}
