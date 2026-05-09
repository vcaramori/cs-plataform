import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const QuoteSchema = z.object({
  id: z.string().uuid(),
  quote: z.string(),
  sentiment: z.number().min(-1).max(1),
  date: z.string(),
  account_name: z.string(),
})

const ResponseSchema = z.object({
  quotes: z.array(QuoteSchema),
})

type QuotesFeed = z.infer<typeof ResponseSchema>

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '20')

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
      .select('id, name')
      .eq('csm_owner_id', profile.id)

    if (!accounts || accounts.length === 0) {
      const emptyQuotes: QuotesFeed = { quotes: [] }
      return NextResponse.json(emptyQuotes)
    }

    const accountMap = new Map(accounts.map(a => [a.id, a.name]))

    // Get recent interactions with sentiment and quotes
    const { data: interactions } = await supabase
      .from('interactions')
      .select('id, account_id, description, created_at, sentiment_score')
      .in('account_id', accounts.map(a => a.id))
      .not('sentiment_score', 'is', null)
      .not('description', 'is', null)
      .order('created_at', { ascending: false })
      .limit(limit)

    if (!interactions || interactions.length === 0) {
      const emptyQuotes: QuotesFeed = { quotes: [] }
      return NextResponse.json(emptyQuotes)
    }

    const quotes: z.infer<typeof QuoteSchema>[] = interactions
      .filter(i => i.description && i.description.length > 10) // Filter short interactions
      .map(i => ({
        id: i.id,
        quote: i.description.substring(0, 500), // Cap quote length
        sentiment: i.sentiment_score || 0,
        date: i.created_at?.split('T')[0] || '',
        account_name: accountMap.get(i.account_id) || 'Unknown Account',
      }))
      .slice(0, limit)

    const result: QuotesFeed = { quotes }
    return NextResponse.json(result)
  } catch (error) {
    console.error('[quotes] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
