import { createClient } from '@supabase/supabase-js'
import { generateText } from '@/lib/llm/gateway'
import { buildSystemInstruction } from '@/lib/ai/ai-context'

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
)

// Predefined categories for categorization
const PREDEFINED_CATEGORIES = [
  'Bug',
  'Feature Request',
  'Account/Billing',
  'Performance',
  'Other'
]

interface CategorizationResult {
  category: string
  confidence: number
  reasoning: string
}

/**
 * Categorize a ticket using Gemini AI
 * Analyzes title + description to suggest a category
 */
export async function categorizeTicketAutomatically(
  ticketId: string,
  title: string,
  description: string,
  currentCategory?: string | null
): Promise<CategorizationResult> {
  // Skip if already categorized manually
  if (currentCategory && currentCategory !== '') {
    return {
      category: currentCategory,
      confidence: 1.0,
      reasoning: 'Already categorized manually'
    }
  }

  const prompt = `Categorize este ticket de suporte.

Título do ticket: ${title}

Descrição do ticket:
${description}

Responda SOMENTE com o objeto JSON no formato: {"category": "<uma das 5 categorias>", "confidence": 0.0 a 1.0, "reasoning": "explicação breve em português"}`

  try {
    const response = await generateText(prompt, {
      systemInstruction: await buildSystemInstruction('support_categorization'),
      maxOutputTokens: 200,
      temperature: 0.3
    })

    const text = response.result.trim()

    // Parse JSON from response
    const jsonMatch = text.match(/\{[\s\S]*\}/)
    if (!jsonMatch) {
      return {
        category: 'Other',
        confidence: 0.5,
        reasoning: 'Unable to parse categorization result'
      }
    }

    const result = JSON.parse(jsonMatch[0]) as CategorizationResult

    // Validate category
    if (!PREDEFINED_CATEGORIES.includes(result.category)) {
      result.category = 'Other'
      result.confidence = Math.max(0.0, result.confidence - 0.2)
    }

    // Clamp confidence
    result.confidence = Math.max(0.0, Math.min(1.0, result.confidence))

    return result
  } catch (error) {
    console.error('[Categorization] Error calling Gemini:', error)
    return {
      category: 'Other',
      confidence: 0.3,
      reasoning: 'Error occurred during categorization'
    }
  }
}

/**
 * Process auto-categorization for a ticket
 * Creates suggestion record and auto-applies if confidence >= threshold
 */
export async function processAutoCategorizationForTicket(
  ticketId: string,
  title: string,
  description: string,
  currentCategory?: string | null
): Promise<{ applied: boolean; suggestion: CategorizationResult }> {
  const suggestion = await categorizeTicketAutomatically(
    ticketId,
    title,
    description,
    currentCategory
  )

  const shouldAutoApply = suggestion.confidence >= 0.75

  // Create suggestion record in DB
  const { error: insertError } = await supabase
    .from('categorization_suggestions')
    .insert({
      ticket_id: ticketId,
      suggested_category: suggestion.category,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      status: shouldAutoApply ? 'accepted' : 'pending',
      auto_applied: shouldAutoApply
    })

  if (insertError) {
    console.error('[Categorization] Error saving suggestion:', insertError)
    return { applied: false, suggestion }
  }

  // Auto-apply if confidence is high
  if (shouldAutoApply) {
    const { error: updateError } = await supabase
      .from('support_tickets')
      .update({
        suggested_category: suggestion.category,
        suggestion_confidence: suggestion.confidence,
        suggestion_reasoning: suggestion.reasoning,
        category: suggestion.category // Auto-apply to category field
      })
      .eq('id', ticketId)

    if (updateError) {
      console.error('[Categorization] Error applying categorization:', updateError)
      return { applied: false, suggestion }
    }

    // Log event
    await supabase.from('ticket_events').insert({
      ticket_id: ticketId,
      event_type: 'auto_categorized',
      payload: {
        category: suggestion.category,
        confidence: suggestion.confidence,
        reasoning: suggestion.reasoning,
        auto_applied: true
      }
    })

    return { applied: true, suggestion }
  }

  // Store suggestion without auto-applying
  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      suggested_category: suggestion.category,
      suggestion_confidence: suggestion.confidence,
      suggestion_reasoning: suggestion.reasoning
    })
    .eq('id', ticketId)

  if (updateError) {
    console.error('[Categorization] Error saving suggestion to ticket:', updateError)
  }

  // Log event
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'auto_categorized',
    payload: {
      category: suggestion.category,
      confidence: suggestion.confidence,
      reasoning: suggestion.reasoning,
      auto_applied: false
    }
  })

  return { applied: false, suggestion }
}

/**
 * Accept a pending categorization suggestion
 */
export async function acceptCategorizationSuggestion(
  ticketId: string,
  suggestionId: string,
  userId: string
): Promise<boolean> {
  const { data: suggestion, error: fetchError } = await supabase
    .from('categorization_suggestions')
    .select('suggested_category, confidence, reasoning')
    .eq('id', suggestionId)
    .single()

  if (fetchError || !suggestion) {
    console.error('[Categorization] Error fetching suggestion:', fetchError)
    return false
  }

  // Update ticket with accepted category
  const { error: updateError } = await supabase
    .from('support_tickets')
    .update({
      category: suggestion.suggested_category
    })
    .eq('id', ticketId)

  if (updateError) {
    console.error('[Categorization] Error updating ticket:', updateError)
    return false
  }

  // Update suggestion record
  const { error: suggestionError } = await supabase
    .from('categorization_suggestions')
    .update({
      status: 'accepted',
      applied_at: new Date().toISOString(),
      applied_by: userId
    })
    .eq('id', suggestionId)

  if (suggestionError) {
    console.error('[Categorization] Error updating suggestion:', suggestionError)
    return false
  }

  // Log event
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'categorization_accepted',
    payload: {
      category: suggestion.suggested_category,
      confidence: suggestion.confidence,
      accepted_by: userId
    }
  })

  return true
}

/**
 * Reject a pending categorization suggestion
 */
export async function rejectCategorizationSuggestion(
  ticketId: string,
  suggestionId: string,
  userId: string
): Promise<boolean> {
  const { data: suggestion, error: fetchError } = await supabase
    .from('categorization_suggestions')
    .select('suggested_category, confidence')
    .eq('id', suggestionId)
    .single()

  if (fetchError || !suggestion) {
    console.error('[Categorization] Error fetching suggestion:', fetchError)
    return false
  }

  // Update suggestion record
  const { error: suggestionError } = await supabase
    .from('categorization_suggestions')
    .update({
      status: 'rejected',
      applied_at: new Date().toISOString(),
      applied_by: userId
    })
    .eq('id', suggestionId)

  if (suggestionError) {
    console.error('[Categorization] Error updating suggestion:', suggestionError)
    return false
  }

  // Log event
  await supabase.from('ticket_events').insert({
    ticket_id: ticketId,
    event_type: 'categorization_rejected',
    payload: {
      category: suggestion.suggested_category,
      confidence: suggestion.confidence,
      rejected_by: userId
    }
  })

  return true
}

/**
 * Get latest categorization suggestion for a ticket
 */
export async function getLatestCategorizationSuggestion(ticketId: string) {
  const { data, error } = await supabase
    .from('categorization_suggestions')
    .select('*')
    .eq('ticket_id', ticketId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  if (error) {
    console.error('[Categorization] Error fetching suggestion:', error)
    return null
  }

  return data
}
