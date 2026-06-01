import { createClient } from '@supabase/supabase-js'
import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

const CACHE_TTL_MINUTES = 5
const SIMILARITY_THRESHOLD = 0.75
const SIMILAR_TICKETS_LIMIT = 5

interface ReplySuggestion {
  suggestion: string
  confidence: number
  sources: string[] // ticket IDs used as reference
  modelUsed: string
}

interface SimilarTicket {
  id: string
  title: string
  similarityScore: number
  latestReply: string | null
  category?: string | null
}

/**
 * Fetch similar resolved tickets for RAG context
 */
async function fetchSimilarTickets(
  ticketId: string,
  limit: number = SIMILAR_TICKETS_LIMIT
): Promise<SimilarTicket[]> {
  try {
    const { data, error } = await supabase.rpc(
      'get_similar_tickets_for_rag',
      {
        p_ticket_id: ticketId,
        p_limit: limit,
        p_threshold: SIMILARITY_THRESHOLD
      }
    )

    if (error) {
      console.error('[RAG] Error fetching similar tickets:', error)
      return []
    }

    return (data || []).map((row: any) => ({
      id: row.similar_ticket_id,
      title: row.similar_ticket_title,
      similarityScore: 1 - row.similarity_score, // convert distance to similarity
      latestReply: row.latest_reply,
      category: row.category
    }))
  } catch (error) {
    console.error('[RAG] Error in fetchSimilarTickets:', error)
    return []
  }
}

/**
 * Get cached suggestion if available and not expired
 */
async function getCachedSuggestion(ticketId: string) {
  try {
    const { data, error } = await supabase
      .from('reply_suggestion_cache')
      .select('suggestion_id, expires_at')
      .eq('ticket_id', ticketId)
      .single()

    if (error || !data) {
      return null
    }

    if (new Date() > new Date(data.expires_at)) {
      // Cache expired
      await supabase
        .from('reply_suggestion_cache')
        .delete()
        .eq('ticket_id', ticketId)
      return null
    }

    // Fetch the actual suggestion
    const { data: suggestion, error: fetchError } = await supabase
      .from('reply_suggestions')
      .select('*')
      .eq('id', data.suggestion_id)
      .single()

    if (fetchError) {
      console.error('[RAG] Error fetching cached suggestion:', fetchError)
      return null
    }

    return suggestion
  } catch (error) {
    console.error('[RAG] Error getting cached suggestion:', error)
    return null
  }
}

/**
 * Cache a suggestion for 5 minutes
 */
async function cacheSuggestion(
  ticketId: string,
  suggestionId: string
): Promise<boolean> {
  try {
    const expiresAt = new Date(Date.now() + CACHE_TTL_MINUTES * 60 * 1000)

    const { error } = await supabase
      .from('reply_suggestion_cache')
      .upsert(
        {
          ticket_id: ticketId,
          suggestion_id: suggestionId,
          cached_at: new Date().toISOString(),
          expires_at: expiresAt.toISOString()
        },
        { onConflict: 'ticket_id' }
      )

    if (error) {
      console.error('[RAG] Error caching suggestion:', error)
      return false
    }

    return true
  } catch (error) {
    console.error('[RAG] Error in cacheSuggestion:', error)
    return false
  }
}

/**
 * Generate RAG-based reply suggestion using similar tickets as context
 */
export async function generateReplySuggestion(
  ticketId: string
): Promise<ReplySuggestion> {
  try {
    // Check cache first
    const cached = await getCachedSuggestion(ticketId)
    if (cached) {
      return {
        suggestion: cached.suggestion_text,
        confidence: cached.confidence,
        sources: cached.sources || [],
        modelUsed: cached.model_used
      }
    }

    // Fetch current ticket
    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, title, description, category, priority, status')
      .eq('id', ticketId)
      .single()

    if (ticketError || !ticket) {
      return {
        suggestion: '',
        confidence: 0,
        sources: [],
        modelUsed: 'gemini-2.5-flash'
      }
    }

    // Fetch similar tickets for context
    const similarTickets = await fetchSimilarTickets(ticketId)

    // Build RAG context
    let ragContext = ''

    if (similarTickets.length > 0) {
      ragContext = '\n\nContexto de Tickets Similares:\n'
      similarTickets.slice(0, 3).forEach((ticket, idx) => {
        ragContext += `\n${idx + 1}. Ticket: "${ticket.title}" (${Math.round(ticket.similarityScore * 100)}% similar)\n`
        if (ticket.latestReply) {
          ragContext += `   Última resposta: ${ticket.latestReply.substring(0, 200)}...\n`
        }
      })
    }

    // Build prompt for Gemini
    const prompt = `Você é um experiente agente de Customer Success que responde tickets de suporte.

Analise o ticket abaixo e gere uma resposta profissional, clara e empática em português.
Sua resposta deve:
- Reconhecer o problema
- Explicar a solução ou próximos passos
- Oferecer suporte adicional se necessário
- Ser concisa (2-3 parágrafos)

TICKET:
Título: ${ticket.title}
Categoria: ${ticket.category || 'Não categorizado'}
Prioridade: ${ticket.priority}
Descrição: ${ticket.description}

${ragContext}

Gere uma resposta profissional e amigável para este ticket:`

    const response = await generateText(prompt, {
      systemInstruction: await buildSystemInstruction('support_reply_suggestion'),
      maxOutputTokens: 500,
      temperature: 0.7
    })

    const suggestionText = response.result.trim()

    // Store suggestion
    const { data: suggestion, error: insertError } = await supabase
      .from('reply_suggestions')
      .insert({
        ticket_id: ticketId,
        suggestion_text: suggestionText,
        confidence: 0.85, // Default confidence for RAG suggestions
        sources: similarTickets.map(t => t.id),
        model_used: 'gemini-2.5-flash'
      })
      .select()
      .single()

    if (insertError || !suggestion) {
      console.error('[RAG] Error storing suggestion:', insertError)
      return {
        suggestion: suggestionText,
        confidence: 0.85,
        sources: similarTickets.map(t => t.id),
        modelUsed: 'gemini-2.5-flash'
      }
    }

    // Cache the suggestion
    await cacheSuggestion(ticketId, suggestion.id)

    return {
      suggestion: suggestion.suggestion_text,
      confidence: suggestion.confidence,
      sources: suggestion.sources || [],
      modelUsed: suggestion.model_used
    }
  } catch (error) {
    console.error('[RAG] Error generating suggestion:', error)
    return {
      suggestion: '',
      confidence: 0,
      sources: [],
      modelUsed: 'gemini-2.5-flash'
    }
  }
}

/**
 * Accept a reply suggestion (log telemetry)
 */
export async function acceptReplySuggestion(
  ticketId: string,
  suggestionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error: updateError } = await supabase
      .from('reply_suggestions')
      .update({
        accepted_at: new Date().toISOString(),
        accepted_by: userId,
        used_in_reply: true
      })
      .eq('id', suggestionId)

    if (updateError) {
      console.error('[RAG] Error accepting suggestion:', updateError)
      return false
    }

    // Log telemetry
    await supabase.from('reply_suggestion_telemetry').insert({
      ticket_id: ticketId,
      suggestion_id: suggestionId,
      action: 'accepted',
      action_at: new Date().toISOString()
    })

    // Log event
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      event_type: 'reply_suggestion_accepted',
      payload: {
        suggestion_id: suggestionId,
        accepted_by: userId
      }
    })

    return true
  } catch (error) {
    console.error('[RAG] Error in acceptReplySuggestion:', error)
    return false
  }
}

/**
 * Reject a reply suggestion (log telemetry)
 */
export async function rejectReplySuggestion(
  ticketId: string,
  suggestionId: string,
  userId: string
): Promise<boolean> {
  try {
    const { error: updateError } = await supabase
      .from('reply_suggestions')
      .update({
        rejected_at: new Date().toISOString(),
        rejected_by: userId
      })
      .eq('id', suggestionId)

    if (updateError) {
      console.error('[RAG] Error rejecting suggestion:', updateError)
      return false
    }

    // Log telemetry
    await supabase.from('reply_suggestion_telemetry').insert({
      ticket_id: ticketId,
      suggestion_id: suggestionId,
      action: 'rejected',
      action_at: new Date().toISOString()
    })

    // Log event
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      event_type: 'reply_suggestion_rejected',
      payload: {
        suggestion_id: suggestionId,
        rejected_by: userId
      }
    })

    return true
  } catch (error) {
    console.error('[RAG] Error in rejectReplySuggestion:', error)
    return false
  }
}

/**
 * Get latest suggestion for a ticket
 */
export async function getLatestReplySuggestion(ticketId: string) {
  try {
    const { data, error } = await supabase
      .from('reply_suggestions')
      .select('*')
      .eq('ticket_id', ticketId)
      .order('created_at', { ascending: false })
      .limit(1)
      .single()

    if (error) {
      console.error('[RAG] Error fetching latest suggestion:', error)
      return null
    }

    return data
  } catch (error) {
    console.error('[RAG] Error in getLatestReplySuggestion:', error)
    return null
  }
}
