import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const TrendSchema = z.object({
  date: z.string(),
  sentiment_avg: z.number().min(-1).max(1),
})

const ResponseSchema = z.object({
  data: z.array(TrendSchema),
})

type SentimentTrends = z.infer<typeof ResponseSchema>

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
      .eq('auth_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get CSM-owned accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select('id')
      .eq('csm_owner_id', profile.id)

    if (!accounts || accounts.length === 0) {
      const emptyTrends: SentimentTrends = { data: [] }
      return NextResponse.json(emptyTrends)
    }

    const days = 7
    const daysAgo = new Date()
    daysAgo.setDate(daysAgo.getDate() - days)

    // Get interactions with sentiment scores
    const { data: interactions } = await supabase
      .from('interactions')
      .select('sentiment_score, created_at')
      .in('account_id', accounts.map(a => a.id))
      .not('sentiment_score', 'is', null)
      .gte('created_at', daysAgo.toISOString())
      .order('created_at', { ascending: true })

    if (!interactions || interactions.length === 0) {
      const emptyTrends: SentimentTrends = { data: [] }
      return NextResponse.json(emptyTrends)
    }

    // Group by date and calculate average sentiment
    const sentimentByDate = new Map<string, number[]>()

    for (const interaction of interactions) {
      const date = interaction.created_at?.split('T')[0] || ''
      if (!sentimentByDate.has(date)) {
        sentimentByDate.set(date, [])
      }
      sentimentByDate.get(date)?.push(interaction.sentiment_score || 0)
    }

    const data = Array.from(sentimentByDate.entries())
      .map(([date, scores]) => ({
        date,
        sentiment_avg: Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 100) / 100,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    const result: SentimentTrends = { data }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[sentiment-trends] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
