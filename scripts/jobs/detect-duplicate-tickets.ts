/**
 * Cron Job: Detect Duplicate Tickets via Semantic Similarity
 * Runs: Daily at 02:00 UTC
 * Purpose: Identify similar tickets and flag them as potential duplicates
 */

import { createClient } from '@supabase/supabase-js'

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
const supabase = createClient(supabaseUrl, supabaseKey)

function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length !== b.length) {
    console.warn(`Vector dimension mismatch: ${a.length} vs ${b.length}`)
    return 0
  }

  let dotProduct = 0
  let normA = 0
  let normB = 0

  for (let i = 0; i < a.length; i++) {
    dotProduct += a[i] * b[i]
    normA += a[i] * a[i]
    normB += b[i] * b[i]
  }

  const denominator = Math.sqrt(normA) * Math.sqrt(normB)
  if (denominator === 0) return 0

  return dotProduct / denominator
}

async function detectDuplicateTickets() {
  try {
    console.log('[Duplicate Detection] Starting job...')

    // 1. Fetch all open tickets with embeddings
    const { data: tickets, error: fetchErr } = await supabase
      .from('support_tickets')
      .select('id, title, embedding, account_id')
      .eq('status', 'open')
      .not('embedding', 'is', null)

    if (fetchErr || !tickets) {
      console.error('[Duplicate Detection] Error fetching tickets:', fetchErr)
      return { success: false, error: fetchErr?.message, processed: 0 }
    }

    console.log(`[Duplicate Detection] Processing ${tickets.length} open tickets with embeddings`)

    let candidatesFound = 0
    const SIMILARITY_THRESHOLD = 0.85

    // 2. Compute pairwise similarity
    for (let i = 0; i < tickets.length; i++) {
      for (let j = i + 1; j < tickets.length; j++) {
        const ticketA = tickets[i]
        const ticketB = tickets[j]

        // Only compare tickets from the same account
        if (ticketA.account_id !== ticketB.account_id) {
          continue
        }

        // Compute cosine similarity
        const similarity = cosineSimilarity(ticketA.embedding, ticketB.embedding)

        // If above threshold, create/update candidate
        if (similarity >= SIMILARITY_THRESHOLD) {
          const { error: upsertErr } = await supabase
            .from('ticket_similarity_candidates')
            .upsert(
              {
                ticket_a_id: ticketA.id,
                ticket_b_id: ticketB.id,
                similarity_score: similarity,
                status: 'pending_review'
              },
              {
                onConflict: 'ticket_a_id,ticket_b_id'
              }
            )

          if (upsertErr) {
            console.warn(
              `[Duplicate Detection] Error upserting candidate for ${ticketA.id} and ${ticketB.id}:`,
              upsertErr
            )
          } else {
            candidatesFound++
            console.log(
              `[Duplicate Detection] Found duplicate: ${ticketA.id} <-> ${ticketB.id} (score: ${similarity.toFixed(3)})`
            )
          }
        }
      }
    }

    // 3. Log completion
    console.log(`[Duplicate Detection] Job completed. Found ${candidatesFound} duplicate candidates`)

    return {
      success: true,
      processed: tickets.length,
      candidates_found: candidatesFound,
      timestamp: new Date().toISOString()
    }
  } catch (err) {
    console.error('[Duplicate Detection] Fatal error:', err)
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Unknown error',
      processed: 0
    }
  }
}

// Execute if run directly
if (require.main === module) {
  detectDuplicateTickets().then(result => {
    console.log('[Duplicate Detection] Result:', result)
    process.exit(result.success ? 0 : 1)
  })
}

export { detectDuplicateTickets }
