import { createClient } from '@supabase/supabase-js';
import { verifyHelpDeskRequest } from "@/lib/integrations/helpdesk/auth"
import { analyzeUnanalyzedReplies } from '@/lib/support/sentiment-analysis';

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(request: Request) {
  // Verify API secret for cron security
  if (!(await verifyHelpDeskRequest(request))) {
    return new Response(
      JSON.stringify({ error: 'Unauthorized' }),
      { status: 401 }
    );
  }

  try {
    const startTime = Date.now();

    // Analyze unanalyzed replies
    const analyzedCount = await analyzeUnanalyzedReplies();

    // Regenerate stale sentiment caches (older than 24h)
    const { data: staleCaches, error: staleError } = await supabase
      .from('stale_sentiment_caches')
      .select('id');

    if (staleError) {
      console.error('Error fetching stale sentiment caches:', staleError);
    } else if (staleCaches && staleCaches.length > 0) {
      // Regenerate caches
      const cacheRegenerationPromises = staleCaches.map((cache) =>
        supabase.rpc('regenerate_sentiment_trend_cache', {
          ticket_id_input: cache.id,
        })
      );

      await Promise.all(cacheRegenerationPromises);
    }

    const duration = Date.now() - startTime;

    // Telemetry
    const telemetry = {
      analyzed_count: analyzedCount,
      cache_regenerated_count: staleCaches?.length || 0,
      duration_ms: duration,
      timestamp: new Date().toISOString(),
    };


    return new Response(
      JSON.stringify({
        success: true,
        data: telemetry,
      }),
      { status: 200 }
    );
  } catch (error) {
    console.error('Sentiment analysis cron error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      }),
      { status: 500 }
    );
  }
}
