import { NextResponse } from 'next/server'
import { createClient } from '@supabase/supabase-js'
import { GoogleGenerativeAI } from '@google/generative-ai'

const supabase = createClient(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { autoRefreshToken: false, persistSession: false } }
)

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_API_KEY!)

export const maxDuration = 300

export async function POST(request: Request) {
  const authHeader = request.headers.get('authorization')
  const expectedAuth = `Bearer ${process.env.API_SECRET}`

  if (!authHeader || authHeader !== expectedAuth) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const last24h = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()

    const { data: interactions } = await supabase
      .from('interactions')
      .select('id, account_id, title, raw_transcript')
      .is('sentiment_score', null)
      .gte('created_at', last24h)
      .limit(100)

    const { data: npsResponses } = await supabase
      .from('nps_responses')
      .select('id, account_id, score, comment')
      .is('sentiment_score', null)
      .gte('created_at', last24h)
      .limit(50)

    const model = genAI.getGenerativeModel({ model: 'gemini-pro' })

    let processed = 0
    let failed = 0

    // Process interactions
    for (const interaction of interactions || []) {
      try {
        const prompt = `Analyze this customer interaction for sentiment and themes:

"${interaction.raw_transcript || interaction.title}"

Return JSON:
{
  "sentiment_score": -1 to 1 number,
  "themes": ["theme1", "theme2"],
  "quotes": ["quote1", "quote2"]
}`

        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const match = text.match(/\{[\s\S]*\}/)
        const parsed = match ? JSON.parse(match[0]) : { sentiment_score: 0, themes: [], quotes: [] }

        await supabase
          .from('interactions')
          .update({ sentiment_score: parsed.sentiment_score })
          .eq('id', interaction.id)

        for (const theme of parsed.themes || []) {
          await supabase
            .from('interaction_themes')
            .insert({ interaction_id: interaction.id, theme })
        }

        processed++
      } catch (err) {
        failed++
      }
    }

    // Process NPS responses similarly
    for (const nps of npsResponses || []) {
      try {
        const prompt = `Sentiment analysis: "${nps.comment}". Return JSON with sentiment_score (-1 to 1 number) and themes (array).`
        const result = await model.generateContent(prompt)
        const text = result.response.text()
        const match = text.match(/\{[\s\S]*\}/)
        const parsed = match ? JSON.parse(match[0]) : { sentiment_score: 0, themes: [] }

        processed++
      } catch (err) {
        failed++
      }
    }

    return NextResponse.json({
      success: true,
      processed,
      failed,
    })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
