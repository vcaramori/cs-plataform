import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    const { data: interactions } = await supabase
      .from('interactions')
      .select('title, sentiment_score, created_at')
      .not('sentiment_score', 'is', null)
      .order('created_at', { ascending: false })
      .limit(20)

    const quotes = interactions?.map((i) => ({
      quote: i.title,
      sentiment: i.sentiment_score,
      date: i.created_at,
    })) || []

    return NextResponse.json({ quotes })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
