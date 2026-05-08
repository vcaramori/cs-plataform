import { NextResponse } from 'next/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { GoogleGenAI } from '@google/genai'
import { env } from '@/lib/env'

export const maxDuration = 300 // Allow up to 5 minutes

export async function POST(request: Request) {
  // Check API Secret for internal cron auth
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = getSupabaseAdminClient()
  const gemini = new GoogleGenAI({
    apiKey: process.env.GEMINI_API_KEY,
  })

  try {
    const yesterday = new Date()
    yesterday.setDate(yesterday.getDate() - 1)

    // 1. Buscar interações das últimas 24h sem sentimento
    const { data: interactions, error: intError } = await supabase
      .from('interactions')
      .select('id, title, account_id')
      // .gte('created_at', yesterday.toISOString())
      // .is('sentiment_score', null)

    if (intError) {
      console.error('Error fetching interactions:', intError)
    }

    // 2. Buscar respostas de NPS das últimas 24h sem sentimento e com comentário
    const { data: npsResponses, error: npsError } = await supabase
      .from('nps_responses')
      .select('id, comment, account_id')
      .gte('created_at', yesterday.toISOString())
      .is('sentiment_score', null)
      .not('comment', 'is', null)

    if (npsError) {
      console.error('Error fetching NPS responses:', npsError)
    }

    console.log(`[VoC Cron] Found ${interactions?.length || 0} interactions and ${npsResponses?.length || 0} NPS responses to analyze`)

    let processedCount = 0

    // Processar Interações
    if (interactions && interactions.length > 0) {
      for (const interaction of interactions) {
        const textToAnalyze = interaction.description || interaction.title
        if (!textToAnalyze) continue

        try {
          console.log(`Analyzing interaction ${interaction.id}: "${textToAnalyze}"`)
          const parsed = await analyzeTextWithGemini(gemini, textToAnalyze)
          if (!parsed) {
            console.log(`Skipping interaction ${interaction.id} (parse failed)`)
            continue
          }

          // Atualizar interação
          await supabase
            .from('interactions')
            .update({ 
              sentiment_score: parsed.sentiment_score,
              quotes: parsed.quotes || []
            })
            .eq('id', interaction.id)

          // Salvar temas
          if (parsed.themes && Array.isArray(parsed.themes)) {
            const themesToInsert = parsed.themes.map((theme: string) => ({
              interaction_id: interaction.id,
              theme: theme.toLowerCase().trim()
            }))

            await supabase
              .from('interaction_themes')
              .insert(themesToInsert)
          }

          processedCount++
        } catch (e) {
          console.error(`Error analyzing interaction ${interaction.id}:`, e)
        }
      }
    }

    // Processar Respostas NPS
    if (npsResponses && npsResponses.length > 0) {
      for (const response of npsResponses) {
        if (!response.comment) continue

        try {
          const parsed = await analyzeTextWithGemini(gemini, response.comment)
          if (!parsed) continue

          // Atualizar resposta NPS
          await supabase
            .from('nps_responses')
            .update({ sentiment_score: parsed.sentiment_score })
            .eq('id', response.id)

          processedCount++
        } catch (e) {
          console.error(`Error analyzing NPS response ${response.id}:`, e)
        }
      }
    }

    return NextResponse.json({
      success: true,
      processed: processedCount,
      total: (interactions?.length || 0) + (npsResponses?.length || 0)
    })

  } catch (error: any) {
    console.error('[VoC Cron] Fatal error:', error)
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

async function analyzeTextWithGemini(gemini: any, text: string) {
  const prompt = `Analise o sentimento e temas do seguinte texto em PT-BR.
Retorne APENAS o JSON no formato especificado no schema.
Não adicione explicações, saudações ou texto antes/depois.
Texto:
${text}`

  try {
    const response = await gemini.models.generateContent({
      model: process.env.GEMINI_FLASH_MODEL || 'gemini-2.5-flash',
      contents: prompt,
      config: {
        temperature: 0.2,
        maxOutputTokens: 1000,
        responseMimeType: 'application/json',
        responseSchema: {
          type: 'OBJECT',
          properties: {
            sentiment_score: { type: 'NUMBER' },
            themes: { type: 'ARRAY', items: { type: 'STRING' } },
            quotes: { type: 'ARRAY', items: { type: 'STRING' } }
          },
          required: ['sentiment_score', 'themes', 'quotes']
        }
      },
    })

    if (!response || !response.text) return null

    const content = response.text.trim()
    const jsonMatch = content.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      console.error('No JSON found in Gemini response:', content)
      return null
    }
    return JSON.parse(jsonMatch[0])
  } catch (e) {
    console.error(`Gemini call failed for text "${text.substring(0, 50)}...":`, e)
    return null
  }
}
