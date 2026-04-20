import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { analyzeAgentReply } from '@/lib/support/ai-reply-analyzer'

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const { body, category } = await request.json()
    if (!body) return NextResponse.json({ error: 'Body required' }, { status: 400 })

    const analysis = await analyzeAgentReply(body, category)
    return NextResponse.json(analysis)
  } catch (err) {
    console.error('[API Analyze Reply] Error:', err)
    return NextResponse.json({ error: 'Analysis failed' }, { status: 500 })
  }
}
