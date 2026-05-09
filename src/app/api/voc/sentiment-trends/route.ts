import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    const thirtyDaysAgo = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()

    const { data: interactions } = await supabase
      .from('interactions')
      .select('sentiment_score, created_at')
      .gte('created_at', thirtyDaysAgo)
      .not('sentiment_score', 'is', null)

    const grouped = {} as Record<string, number[]>
    interactions?.forEach((i) => {
      const date = new Date(i.created_at).toLocaleDateString('en-CA')
      if (!grouped[date]) grouped[date] = []
      grouped[date].push(i.sentiment_score)
    })

    const data = Object.entries(grouped)
      .map(([date, scores]) => ({
        date,
        sentiment: scores.reduce((a, b) => a + b, 0) / scores.length,
      }))
      .sort((a, b) => a.date.localeCompare(b.date))

    return NextResponse.json({ data })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
