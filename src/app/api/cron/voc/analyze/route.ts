import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateText } from '@/lib/llm/gateway'

export const maxDuration = 300

const BATCH_SIZE = 10
const MAX_RETRIES = 3

async function sleep(ms: number) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

async function analyzeWithRetry(text: string, retries = 0): Promise<any> {
  try {
    const prompt = `Analyze this customer interaction for sentiment and themes:

"${text}"

Return ONLY valid JSON (no markdown):
{
  "sentiment_score": <number from -1 to 1>,
  "themes": ["theme1", "theme2"],
  "key_quote": "exact quote from text or null"
}`

    const { result: responseText } = await generateText(prompt, {
      temperature: 0.1,
      maxOutputTokens: 300,
    })

    const jsonMatch = responseText.match(/\{[\s\S]*\}/)
    if (!jsonMatch) throw new Error('No JSON in response')

    const parsed = JSON.parse(jsonMatch[0])
    return {
      sentiment_score: Math.max(-1, Math.min(1, parsed.sentiment_score || 0)),
      themes: (parsed.themes || []).slice(0, 5),
      key_quote: parsed.key_quote || null,
    }
  } catch (error) {
    if (retries < MAX_RETRIES) {
      await sleep(Math.pow(2, retries) * 1000) // Exponential backoff
      return analyzeWithRetry(text, retries + 1)
    }
    throw error
  }
}

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.API_SECRET}`

  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  let processed = 0
  let failed = 0

  try {
    // Get unprocessed interactions
    const { data: interactions, error: interactionsError } = await supabase
      .from('interactions')
      .select('id, account_id, description, activity_type')
      .is('sentiment_score', null)
      .gte('created_at', last24h)
      .limit(BATCH_SIZE)

    if (interactionsError) throw interactionsError

    // Get unprocessed NPS responses
    const { data: npsResponses, error: npsError } = await supabase
      .from('nps_responses')
      .select('id, account_id, score, feedback')
      .is('sentiment_score', null)
      .gte('created_at', last24h)
      .limit(BATCH_SIZE)

    if (npsError) throw npsError

    const processedIds = new Set<string>()

    // Process interactions in batches
    for (let i = 0; i < (interactions || []).length; i += BATCH_SIZE) {
      const batch = (interactions || []).slice(i, i + BATCH_SIZE)

      for (const interaction of batch) {
        try {
          if (processedIds.has(interaction.id)) continue

          const text = interaction.description || `${interaction.activity_type}`
          const analysis = await analyzeWithRetry(text)

          await supabase
            .from('interactions')
            .update({ sentiment_score: analysis.sentiment_score })
            .eq('id', interaction.id)

          // Insert themes
          for (const theme of analysis.themes) {
            await supabase
              .from('interaction_themes')
              .insert({
                interaction_id: interaction.id,
                theme,
                frequency: 1,
              })
              .select()
          }

          processedIds.add(interaction.id)
          processed++
        } catch (error) {
          console.error(`[VoC] Failed to process interaction ${interaction.id}:`, error)
          failed++
        }
      }
    }

    // Process NPS responses
    for (let i = 0; i < (npsResponses || []).length; i += BATCH_SIZE) {
      const batch = (npsResponses || []).slice(i, i + BATCH_SIZE)

      for (const nps of batch) {
        try {
          if (processedIds.has(nps.id)) continue

          const text = nps.feedback || `NPS Score: ${nps.score}`
          const analysis = await analyzeWithRetry(text)

          await supabase
            .from('nps_responses')
            .update({ sentiment_score: analysis.sentiment_score })
            .eq('id', nps.id)

          processedIds.add(nps.id)
          processed++
        } catch (error) {
          console.error(`[VoC] Failed to process NPS ${nps.id}:`, error)
          failed++
        }
      }
    }

    if (processed > 1000) {
      console.warn(`[VoC] Large batch detected: ${processed} interactions processed. Possible double-run.`)
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
      ran_at: new Date().toISOString(),
    })
  } catch (error: any) {
    console.error('[VoC Cron] Error:', error)
    return NextResponse.json(
      { error: error.message, success: false },
      { status: 500 }
    )
  }
}
