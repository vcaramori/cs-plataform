import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

export async function GET() {
  try {
    const { data: themes } = await supabase
      .from('interaction_themes')
      .select('theme')

    const themeCounts = {} as Record<string, number>
    themes?.forEach((t) => {
      themeCounts[t.theme] = (themeCounts[t.theme] || 0) + 1
    })

    const sorted = Object.entries(themeCounts)
      .map(([theme, count]) => ({ theme, count }))
      .sort((a, b) => b.count - a.count)

    return NextResponse.json({
      pains: sorted.slice(0, 5),
      praises: sorted.slice(5, 10),
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
