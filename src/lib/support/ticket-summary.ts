import { createClient } from '@supabase/supabase-js'
import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const SUMMARY_CACHE_HOURS = 24
const MAX_SUMMARY_LENGTH = 150

interface TicketSummaryResult {
  summary: string
  generatedAt: string
  isStale: boolean
}

/**
 * Generate ticket summary using Gemini
 * Analyzes title, description, replies, category, and priority
 */
export async function generateTicketSummary(
  ticketId: string
): Promise<string> {
  try {
    // Fetch ticket with recent replies
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, title, description, category, priority, status')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return ''
    }

    // Fetch last 3 replies/notes
    const { data: events, error: eventsError } = await supabase
      .from('ticket_events')
      .select('id, event_type, created_at, payload')
      .eq('ticket_id', ticketId)
      .in('event_type', ['reply', 'note'])
      .order('created_at', { ascending: false })
      .limit(3)

    if (eventsError) {
      console.error('[TicketSummary] Error fetching events:', eventsError)
    }

    // Build context
    let replyContext = ''
    if (events && events.length > 0) {
      replyContext = '\n\nÚltimas respostas:\n'
      events.forEach((event, idx) => {
        const body = event.payload?.body || ''
        replyContext += `${idx + 1}. ${body.substring(0, 100)}...\n`
      })
    }

    // Build prompt
    const prompt = `Título: ${ticket.title}
Descrição: ${ticket.description}
Categoria: ${ticket.category || 'Não categorizado'}
Prioridade: ${ticket.priority}
Status: ${ticket.status}
${replyContext}`

    const response = await generateText(prompt, {
      systemInstruction: await buildSystemInstruction('support_summary'),
      maxOutputTokens: 100,
      temperature: 0.3,
      disableThinking: true
    })

    const cleanResult = response.result.replace(/<think>[\s\S]*?<\/think>/g, '').trim()
    const summary = cleanResult.substring(0, MAX_SUMMARY_LENGTH)

    return summary
  } catch (error) {
    console.error('[TicketSummary] Error generating summary:', error)
    return ''
  }
}

/**
 * Get or generate ticket summary
 * Returns cached summary if available and valid (< 24h)
 */
export async function getOrGenerateTicketSummary(
  ticketId: string
): Promise<TicketSummaryResult> {
  try {
    // Check if cached summary is still valid
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('summary, summary_generated_at')
      .eq('id', ticketId)
      .single()

    if (ticketError) {
      console.error('[TicketSummary] Error fetching ticket:', ticketError)
      return {
        summary: '',
        generatedAt: new Date().toISOString(),
        isStale: true
      }
    }

    // Check if cached and not stale
    if (ticket.summary && ticket.summary_generated_at) {
      const generatedAt = new Date(ticket.summary_generated_at)
      const now = new Date()
      const hoursOld = (now.getTime() - generatedAt.getTime()) / (1000 * 60 * 60)

      if (hoursOld < SUMMARY_CACHE_HOURS) {
        return {
          summary: ticket.summary,
          generatedAt: ticket.summary_generated_at,
          isStale: false
        }
      }
    }

    // Generate new summary
    const summary = await generateTicketSummary(ticketId)
    const now = new Date().toISOString()

    // Update cache
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        summary: summary || null,
        summary_generated_at: summary ? now : null
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error('[TicketSummary] Error updating summary:', updateError)
    }

    // Store in history
    if (summary) {
      await supabase.from('ticket_summary_history').insert({
        ticket_id: ticketId,
        summary_text: summary,
        generated_by: 'ai',
        regenerated_at: now
      })
    }

    return {
      summary: summary || '',
      generatedAt: now,
      isStale: false
    }
  } catch (error) {
    console.error('[TicketSummary] Error in getOrGenerateTicketSummary:', error)
    return {
      summary: '',
      generatedAt: new Date().toISOString(),
      isStale: true
    }
  }
}

/**
 * Force regenerate summary (e.g., admin action)
 */
export async function regenerateTicketSummary(
  ticketId: string,
  userId?: string
): Promise<TicketSummaryResult> {
  try {
    // Generate new summary
    const summary = await generateTicketSummary(ticketId)
    const now = new Date().toISOString()

    // Update ticket
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        summary: summary || null,
        summary_generated_at: summary ? now : null
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error('[TicketSummary] Error updating summary:', updateError)
      return {
        summary: '',
        generatedAt: now,
        isStale: true
      }
    }

    // Store in history
    if (summary) {
      await supabase.from('ticket_summary_history').insert({
        ticket_id: ticketId,
        summary_text: summary,
        generated_by: userId ? 'manual' : 'ai',
        regenerated_at: now,
        regenerated_by: userId
      })

      // Log event
      await supabase.from('ticket_events').insert({
        ticket_id: ticketId,
        event_type: 'summary_regenerated',
        payload: {
          summary,
          regenerated_by: userId
        }
      })
    }

    return {
      summary: summary || '',
      generatedAt: now,
      isStale: false
    }
  } catch (error) {
    console.error('[TicketSummary] Error regenerating summary:', error)
    return {
      summary: '',
      generatedAt: new Date().toISOString(),
      isStale: true
    }
  }
}

/**
 * Mark summary as stale when new reply arrives
 */
export async function invalidateTicketSummary(
  ticketId: string
): Promise<boolean> {
  try {
    // Mark as stale
    const { error: cacheError } = await supabase
      .from('ticket_summary_cache')
      .update({ stale: true })
      .eq('ticket_id', ticketId)

    if (cacheError) {
      console.error('[TicketSummary] Error marking cache stale:', cacheError)
    }

    // Clear from ticket
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        summary: null,
        summary_generated_at: null
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error('[TicketSummary] Error invalidating summary:', updateError)
      return false
    }

    return true
  } catch (error) {
    console.error('[TicketSummary] Error in invalidateTicketSummary:', error)
    return false
  }
}
