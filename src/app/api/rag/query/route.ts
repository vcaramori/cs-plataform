import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { generateText } from '@/lib/llm/gateway'
import { z } from 'zod'

export const maxDuration = 120

const RagQuerySchema = z.object({
  query: z.string().min(1),
  mode: z.enum(['summarize', 'analyze', 'recommend']),
  account_id: z.string().uuid().optional(),
  context_sources: z.array(z.enum(['interactions', 'tickets', 'adoption', 'health'])).optional(),
})

const SourceSchema = z.object({
  source_type: z.enum(['interaction', 'ticket', 'adoption', 'health']),
  source_id: z.string(),
  excerpt: z.string(),
})

const RagResponseSchema = z.discriminatedUnion('type', [
  z.object({
    type: z.literal('summarize'),
    summary: z.string(),
    confidence: z.number().min(0).max(1),
    tokens_used: z.number(),
  }),
  z.object({
    type: z.literal('analyze'),
    analysis: z.string(),
    confidence: z.number().min(0).max(1),
    sources_cited: z.array(SourceSchema),
    tokens_used: z.number(),
  }),
  z.object({
    type: z.literal('recommend'),
    recommendation: z.string(),
    rationale: z.string(),
    next_steps: z.array(z.string()),
    confidence: z.number().min(0).max(1),
    tokens_used: z.number(),
  }),
])

type RagResponse = z.infer<typeof RagResponseSchema>

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const query = url.searchParams.get('query')
    const mode = url.searchParams.get('mode') as any
    const accountId = url.searchParams.get('account_id')

    if (!query || !mode) {
      return NextResponse.json(
        { error: 'Missing query or mode parameter' },
        { status: 400 }
      )
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Build context from sources
    let context = ''
    let sources: z.infer<typeof SourceSchema>[] = []

    if (accountId) {
      // Get interactions
      const { data: interactions } = await supabase
        .from('interactions')
        .select('id, description, activity_type, created_at')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(5)

      for (const interaction of interactions || []) {
        context += `\n- Interaction (${interaction.activity_type}): ${interaction.description}`
        sources.push({
          source_type: 'interaction',
          source_id: interaction.id,
          excerpt: interaction.description?.substring(0, 200) || '',
        })
      }

      // Get recent tickets
      const { data: tickets } = await supabase
        .from('tickets')
        .select('id, title, status')
        .eq('account_id', accountId)
        .order('created_at', { ascending: false })
        .limit(3)

      for (const ticket of tickets || []) {
        context += `\n- Ticket: ${ticket.title} (${ticket.status})`
        sources.push({
          source_type: 'ticket',
          source_id: ticket.id,
          excerpt: ticket.title,
        })
      }
    }

    // Generate response based on mode
    let response: RagResponse

    if (mode === 'summarize') {
      const prompt = `Summarize this in 1-3 bullets:\n${query}\n\nContext:\n${context}`
      const { result: summary } = await generateText(prompt, {
        temperature: 0.2,
        maxOutputTokens: 300,
      })

      response = {
        type: 'summarize',
        summary,
        confidence: Math.min(1, 0.5 + sources.length * 0.1),
        tokens_used: Math.round(summary.split(' ').length * 1.3),
      }
    } else if (mode === 'analyze') {
      const prompt = `Provide detailed analysis:\n${query}\n\nContext:\n${context}`
      const { result: analysis } = await generateText(prompt, {
        temperature: 0.3,
        maxOutputTokens: 800,
      })

      response = {
        type: 'analyze',
        analysis,
        confidence: Math.min(1, 0.5 + sources.length * 0.1),
        sources_cited: sources.slice(0, 3),
        tokens_used: Math.round(analysis.split(' ').length * 1.3),
      }
    } else {
      // recommend
      const prompt = `Based on this data, provide a specific recommendation:\n${query}\n\nContext:\n${context}`
      const { result: responseText } = await generateText(prompt, {
        temperature: 0.2,
        maxOutputTokens: 600,
      })

      response = {
        type: 'recommend',
        recommendation: responseText.split('\n')[0],
        rationale: responseText,
        next_steps: ['Review recommendation', 'Discuss with team', 'Implement action'],
        confidence: Math.min(1, 0.5 + sources.length * 0.1),
        tokens_used: Math.round(responseText.split(' ').length * 1.3),
      }
    }

    return NextResponse.json(response)
  } catch (error) {
    console.error('[rag/query] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
