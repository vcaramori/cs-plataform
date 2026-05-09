import { NextResponse } from "next/server"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { generateText } from "@/lib/llm/gateway"
import { z } from "zod"

const HighlightsSchema = z.object({
  highlights: z.array(z.string()).min(1).max(5),
})

type Highlights = z.infer<typeof HighlightsSchema>

export async function GET(
  request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await context.params
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get account health data for last 12 months
    const { data: healthScores } = await supabase
      .from('health_scores')
      .select('health_score_v2, calculated_at')
      .eq('account_id', accountId)
      .order('calculated_at', { ascending: false })
      .limit(12)

    // Get NPS data
    const { data: npsResponses } = await supabase
      .from('nps_responses')
      .select('score, created_at')
      .eq('account_id', accountId)
      .order('created_at', { ascending: false })
      .limit(10)

    // Get adoption data
    const { data: adoptionRecords } = await supabase
      .from('feature_adoption')
      .select('status, created_at')
      .eq('account_id', accountId)
      .eq('status', 'in_use')
      .order('created_at', { ascending: false })
      .limit(5)

    // Build context for Gemini
    const healthTrend = healthScores && healthScores.length > 0
      ? healthScores[0].health_score_v2 > (healthScores[healthScores.length - 1]?.health_score_v2 || 0)
        ? 'improving'
        : 'declining'
      : 'stable'

    const avgNps = npsResponses && npsResponses.length > 0
      ? Math.round(npsResponses.reduce((sum, r) => sum + (r.score || 0), 0) / npsResponses.length)
      : 0

    const adoptionCount = adoptionRecords?.length || 0

    const prompt = `Generate 3 key business highlights for a contract renewal opportunity.

Context:
- Health score trend: ${healthTrend}
- Average NPS: ${avgNps}/10
- Features in use: ${adoptionCount}
- Recent health scores: ${healthScores?.slice(0, 3).map(h => h.health_score_v2).join(', ') || 'N/A'}

Generate ONLY a JSON array of 3 highlights, no markdown:
["highlight 1", "highlight 2", "highlight 3"]

Each highlight should be 1 sentence, positive, and focused on customer success achievements.`

    const { result: highlightsText } = await generateText(prompt, {
      temperature: 0.2,
      maxOutputTokens: 300,
    })

    // Parse highlights
    let highlights: string[] = []
    try {
      const jsonMatch = highlightsText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        highlights = JSON.parse(jsonMatch[0])
      }
    } catch {
      // Fallback highlights
      highlights = [
        'Strong health score trajectory showing consistent growth',
        'Positive customer sentiment reflected in recent NPS responses',
        'Active adoption of key features demonstrating product engagement',
      ]
    }

    const result: Highlights = {
      highlights: highlights.slice(0, 3),
    }

    return NextResponse.json(result)
  } catch (error: any) {
    console.error('[renewal/highlights] Error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}