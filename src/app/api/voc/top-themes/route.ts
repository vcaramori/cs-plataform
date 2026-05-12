import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const ThemeSchema = z.object({
  theme: z.string(),
  count: z.number(),
})

const ResponseSchema = z.object({
  pains: z.array(ThemeSchema),
  praises: z.array(ThemeSchema),
})

type TopThemes = z.infer<typeof ResponseSchema>

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const limit = parseInt(url.searchParams.get('limit') || '5')

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
      .select('id')
      .eq('csm_owner_id', profile.id)

    if (!accounts || accounts.length === 0) {
      const emptyThemes: TopThemes = { pains: [], praises: [] }
      return NextResponse.json(emptyThemes)
    }

    // Get themes with sentiment classification
    const { data: interactions } = await supabase
      .from('interactions')
      .select('sentiment_score, id')
      .in('account_id', accounts.map(a => a.id))
      .not('sentiment_score', 'is', null)

    if (!interactions || interactions.length === 0) {
      const emptyThemes: TopThemes = { pains: [], praises: [] }
      return NextResponse.json(emptyThemes)
    }

    // Get interaction IDs for pain/praise queries
    const painInteractionIds = interactions
      .filter(i => (i.sentiment_score || 0) < -0.3)
      .map(i => i.id)

    const praiseInteractionIds = interactions
      .filter(i => (i.sentiment_score || 0) > 0.3)
      .map(i => i.id)

    // Get themes for pains
    let painsThemes: any[] = []
    if (painInteractionIds.length > 0) {
      const { data } = await supabase
        .from('interaction_themes')
        .select('theme, frequency')
        .in('interaction_id', painInteractionIds)

      // Aggregate by theme
      const themeMap = new Map<string, number>()
      for (const record of data || []) {
        const current = themeMap.get(record.theme) || 0
        themeMap.set(record.theme, current + (record.frequency || 1))
      }

      painsThemes = Array.from(themeMap.entries())
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
    }

    // Get themes for praises
    let praisesThemes: any[] = []
    if (praiseInteractionIds.length > 0) {
      const { data } = await supabase
        .from('interaction_themes')
        .select('theme, frequency')
        .in('interaction_id', praiseInteractionIds)

      // Aggregate by theme
      const themeMap = new Map<string, number>()
      for (const record of data || []) {
        const current = themeMap.get(record.theme) || 0
        themeMap.set(record.theme, current + (record.frequency || 1))
      }

      praisesThemes = Array.from(themeMap.entries())
        .map(([theme, count]) => ({ theme, count }))
        .sort((a, b) => b.count - a.count)
        .slice(0, limit)
    }

    const result: TopThemes = {
      pains: painsThemes,
      praises: praisesThemes,
    }

    return NextResponse.json(result)
  } catch (error) {
    console.error('[top-themes] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
