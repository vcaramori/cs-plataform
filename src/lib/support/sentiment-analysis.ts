import { generateText } from '@/lib/llm/gateway';
import { buildSystemInstruction } from '@/lib/ai/ai-context';
import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

/**
 * Sentiment analysis result from Gemini
 */
export interface SentimentResult {
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number; // 0-1: 0 = extremely negative, 0.5 = neutral, 1 = extremely positive
  keywords: string[];
  confidence: number; // 0-1: confidence level from Gemini
}

/**
 * Analyze sentiment of a single text using Gemini
 *
 * @param text - Text to analyze in Portuguese
 * @returns Sentiment result with score 0-1 and keywords
 */
export async function analyzeSentiment(text: string): Promise<SentimentResult> {
  const timeout = 5000; // 5 second timeout

  try {
    const timeoutId = setTimeout(() => {
      console.warn('Sentiment analysis timeout reached');
    }, timeout);

    const prompt = `Retorne APENAS o JSON no formato {"sentiment":"positive"|"neutral"|"negative","score":0..1,"keywords":[...],"confidence":0..1}.

Texto para analisar (PT-BR):
${text}`;

    const response = await Promise.race([
      generateText(prompt, {
        systemInstruction: await buildSystemInstruction('support_sentiment'),
        temperature: 0.3,
        maxOutputTokens: 200,
        responseMimeType: 'application/json',
        disableThinking: true,
      }),
      new Promise<never>((_, reject) =>
        setTimeout(() => reject(new Error('Sentiment analysis timeout')), timeout)
      ),
    ]);

    clearTimeout(timeoutId);

    if (!response || !response.result) {
      return getFallbackSentiment();
    }

    const content = response.result;
    const parsed = JSON.parse(content.trim());

    return {
      sentiment: parsed.sentiment || 'neutral',
      score: Math.max(0, Math.min(1, parsed.score || 0.5)),
      keywords: Array.isArray(parsed.keywords) ? parsed.keywords : [],
      confidence: Math.max(0, Math.min(1, parsed.confidence || 0.5)),
    };
  } catch (error) {
    console.error('Sentiment analysis error:', error);
    return getFallbackSentiment();
  }
}

/**
 * Analyze multiple replies in parallel with rate limiting
 *
 * @param replyIds - Array of reply IDs to analyze
 * @param maxConcurrent - Maximum concurrent Gemini requests (default 5)
 */
export async function batchAnalyzeSentiments(
  replyIds: string[],
  maxConcurrent: number = 5
): Promise<Map<string, SentimentResult>> {
  const results = new Map<string, SentimentResult>();

  // Fetch reply contents
  const { data: replies, error: fetchError } = await supabase
    .from('support_ticket_messages')
    .select('id, body, ticket_id')
    .in('id', replyIds)
    .is('deleted_at', null);

  if (fetchError || !replies) {
    console.error('Failed to fetch replies for sentiment analysis:', fetchError);
    return results;
  }

  // Process in batches of maxConcurrent
  for (let i = 0; i < replies.length; i += maxConcurrent) {
    const batch = replies.slice(i, i + maxConcurrent);
    const promises = batch.map(async (reply) => {
      const sentiment = await analyzeSentiment(reply.body);
      results.set(reply.id, sentiment);
    });

    await Promise.all(promises);
  }

  // Store results in database
  const insertData = Array.from(results.entries()).map(([replyId, sentiment]) => {
    const reply = replies.find((r) => r.id === replyId)!;
    return {
      reply_id: replyId,
      ticket_id: reply.ticket_id,
      sentiment: sentiment.sentiment,
      score: sentiment.score,
      keywords: sentiment.keywords,
      confidence: sentiment.confidence,
      analyzed_at: new Date().toISOString(),
    };
  });

  if (insertData.length > 0) {
    const { error: insertError } = await supabase
      .from('reply_sentiments')
      .upsert(insertData, { onConflict: 'reply_id' });

    if (insertError) {
      console.error('Failed to store sentiment analysis results:', insertError);
    } else {
      // Log sentiment analysis events
      const eventData = insertData.map((data) => ({
        ticket_id: data.ticket_id,
        event_type: 'sentiment_analyzed',
        payload: {
          reply_id: data.reply_id,
          sentiment: data.sentiment,
          score: data.score,
          confidence: data.confidence,
        },
      }));

      const { error: eventError } = await supabase
        .from('ticket_events')
        .insert(eventData);

      if (eventError) {
        console.error('Failed to log sentiment analysis events:', eventError);
      }
    }
  }

  return results;
}

/**
 * Find unanalyzed replies and analyze them
 * Called by cron job
 */
export async function analyzeUnanalyzedReplies(): Promise<number> {
  // Find replies without sentiment analysis (max 100)
  const { data: unananlyzedReplies, error: fetchError } = await supabase
    .from('support_ticket_messages')
    .select('id')
    .is('deleted_at', null)
    .eq('message_type', 'reply')
    .not(
      'id',
      'in',
      '(SELECT reply_id FROM public.reply_sentiments)'
    )
    .limit(100);

  if (fetchError || !unananlyzedReplies) {
    console.error('Failed to find unanalyzed replies:', fetchError);
    return 0;
  }

  if (unananlyzedReplies.length === 0) {
    return 0;
  }

  const replyIds = unananlyzedReplies.map((r) => r.id);
  await batchAnalyzeSentiments(replyIds);

  return replyIds.length;
}

/**
 * Invalidate sentiment cache for a ticket
 */
export async function invalidateSentimentCache(ticketId: string): Promise<void> {
  const { error } = await supabase
    .from('support_tickets')
    .update({
      sentiment_trend_cache: null,
      sentiment_trend_cache_generated_at: null,
    })
    .eq('id', ticketId);

  if (error) {
    console.error('Failed to invalidate sentiment cache:', error);
  }
}

/**
 * Regenerate sentiment trend cache for a ticket
 */
export async function regenerateSentimentCache(ticketId: string): Promise<void> {
  const { error } = await supabase.rpc('regenerate_sentiment_trend_cache', {
    ticket_id_input: ticketId,
  });

  if (error) {
    console.error('Failed to regenerate sentiment cache:', error);
  }
}

/**
 * Fallback sentiment result when analysis fails
 */
function getFallbackSentiment(): SentimentResult {
  return {
    sentiment: 'neutral',
    score: 0.5,
    keywords: [],
    confidence: 0, // Low confidence indicates fallback
  };
}
