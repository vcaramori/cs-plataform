import { NextRequest, NextResponse } from 'next/server';
import { requireApiAuth, isAuthError } from '@/lib/auth/require-auth';
import { getSupabaseAdminClient } from '@/lib/supabase/admin';

export interface SentimentTrendData {
  timestamp: string;
  sentiment: 'positive' | 'neutral' | 'negative';
  score: number;
  keywords?: string[];
}

export interface SentimentTrendResponse {
  trend: SentimentTrendData[];
  overall: 'positive' | 'neutral' | 'negative';
  trend_direction: 'improving' | 'stable' | 'declining';
  cache_generated_at?: string;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const auth = await requireApiAuth();
    if (isAuthError(auth)) return auth;

    const supabase = getSupabaseAdminClient();
    const { id: ticketId } = await params;

    const { data: ticket, error: ticketError } = await supabase
      .from('support_tickets')
      .select('id, sentiment_trend_cache, sentiment_trend_cache_generated_at')
      .eq('id', ticketId)
      .single();

    if (ticketError || !ticket) {
      return NextResponse.json(
        { error: 'Ticket not found' },
        { status: 404 }
      );
    }

    let trend: SentimentTrendData[] = [];
    let cacheGeneratedAt: string | null = null;

    // Check if cache is valid (24h)
    if (
      ticket.sentiment_trend_cache &&
      ticket.sentiment_trend_cache_generated_at
    ) {
      const cacheAge = Date.now() - new Date(ticket.sentiment_trend_cache_generated_at).getTime();
      const isValid = cacheAge < 24 * 60 * 60 * 1000; // 24 hours in ms

      if (isValid) {
        trend = ticket.sentiment_trend_cache;
        cacheGeneratedAt = ticket.sentiment_trend_cache_generated_at;
      }
    }

    // If cache is empty/stale, fetch fresh data
    if (trend.length === 0) {
      const { data: sentiments, error: sentimentError } = await supabase
        .from('support_ticket_messages')
        .select(
          `
          id,
          created_at,
          reply_sentiments (
            sentiment,
            score,
            keywords
          )
        `
        )
        .eq('ticket_id', ticketId)
        .eq('message_type', 'reply')
        .is('deleted_at', null)
        .order('created_at', { ascending: false })
        .limit(10);

      if (sentimentError) {
        console.error('Error fetching sentiment trend:', sentimentError);
      } else if (sentiments) {
        trend = sentiments
          .filter((msg) => msg.reply_sentiments && msg.reply_sentiments.length > 0)
          .map((msg) => ({
            timestamp: msg.created_at,
            sentiment: msg.reply_sentiments[0].sentiment,
            score: msg.reply_sentiments[0].score,
            keywords: msg.reply_sentiments[0].keywords,
          }));
      }

      // Update cache
      if (trend.length > 0) {
        cacheGeneratedAt = new Date().toISOString();
        const { error: updateError } = await supabase
          .from('support_tickets')
          .update({
            sentiment_trend_cache: trend,
            sentiment_trend_cache_generated_at: cacheGeneratedAt,
          })
          .eq('id', ticketId);

        if (updateError) {
          console.error('Error updating sentiment cache:', updateError);
        }
      }
    }

    // Calculate overall sentiment and trend direction
    const overall = calculateOverallSentiment(trend);
    const trendDirection = calculateTrendDirection(trend);

    const response: SentimentTrendResponse = {
      trend,
      overall,
      trend_direction: trendDirection,
      ...(cacheGeneratedAt && { cache_generated_at: cacheGeneratedAt }),
    };

    return NextResponse.json(response);
  } catch (error) {
    console.error('Sentiment trend endpoint error:', error);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

/**
 * Calculate overall sentiment from trend data
 */
function calculateOverallSentiment(
  trend: SentimentTrendData[]
): 'positive' | 'neutral' | 'negative' {
  if (trend.length === 0) return 'neutral';

  const avgScore = trend.reduce((sum, item) => sum + item.score, 0) / trend.length;

  if (avgScore >= 0.65) return 'positive';
  if (avgScore <= 0.35) return 'negative';
  return 'neutral';
}

/**
 * Calculate trend direction (improving/stable/declining)
 */
function calculateTrendDirection(
  trend: SentimentTrendData[]
): 'improving' | 'stable' | 'declining' {
  if (trend.length < 3) return 'stable';

  // Compare first half vs second half scores
  const midpoint = Math.floor(trend.length / 2);
  const firstHalf = trend.slice(0, midpoint);
  const secondHalf = trend.slice(midpoint);

  const firstAvg = firstHalf.reduce((sum, item) => sum + item.score, 0) / firstHalf.length;
  const secondAvg = secondHalf.reduce((sum, item) => sum + item.score, 0) / secondHalf.length;

  const diff = secondAvg - firstAvg;

  // 0.1 threshold to avoid noise
  if (diff > 0.1) return 'improving';
  if (diff < -0.1) return 'declining';
  return 'stable';
}
