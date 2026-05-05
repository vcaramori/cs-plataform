-- Migration: F1-20 Sentiment Trend Analysis
-- Date: 2026-05-05
-- Objective: Add sentiment analysis for ticket replies with trend tracking

-- ==============================================================================
-- 1. Create reply_sentiments table for storing analyzed sentiments
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reply_sentiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid NOT NULL UNIQUE REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  score numeric(3, 2) NOT NULL CHECK (score >= 0 AND score <= 1),
  keywords text[] DEFAULT '{}',
  analyzed_at timestamptz DEFAULT now(),
  confidence numeric(3, 2) NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_sentiments_reply
ON public.reply_sentiments(reply_id);

CREATE INDEX IF NOT EXISTS idx_reply_sentiments_ticket
ON public.reply_sentiments(ticket_id);

CREATE INDEX IF NOT EXISTS idx_reply_sentiments_analyzed
ON public.reply_sentiments(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_reply_sentiments_sentiment
ON public.reply_sentiments(sentiment);

COMMENT ON TABLE public.reply_sentiments IS 'Sentiment analysis results for ticket replies (positive/neutral/negative)';
COMMENT ON COLUMN public.reply_sentiments.reply_id IS 'Reference to support_ticket_messages.id';
COMMENT ON COLUMN public.reply_sentiments.ticket_id IS 'Denormalized ticket_id for query efficiency';
COMMENT ON COLUMN public.reply_sentiments.sentiment IS 'Sentiment classification: positive, neutral, or negative';
COMMENT ON COLUMN public.reply_sentiments.score IS 'Sentiment score from 0 to 1 (0=extremely negative, 0.5=neutral, 1=extremely positive)';
COMMENT ON COLUMN public.reply_sentiments.keywords IS 'Array of keywords indicating sentiment (e.g. "satisfeito", "resolvido")';
COMMENT ON COLUMN public.reply_sentiments.analyzed_at IS 'Timestamp when sentiment was analyzed';
COMMENT ON COLUMN public.reply_sentiments.confidence IS 'Confidence score from Gemini (0=low, 1=high confidence)';

-- ==============================================================================
-- 2. Add sentiment_trend_cache column to support_tickets
-- ==============================================================================

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS sentiment_trend_cache jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sentiment_trend_cache_generated_at timestamptz;

COMMENT ON COLUMN public.support_tickets.sentiment_trend_cache IS 'JSON array of last 10 sentiment scores for sparkline rendering (cached 24h)';
COMMENT ON COLUMN public.support_tickets.sentiment_trend_cache_generated_at IS 'Timestamp when sentiment_trend_cache was last generated';

-- ==============================================================================
-- 3. Enable RLS on reply_sentiments
-- ==============================================================================

ALTER TABLE public.reply_sentiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view sentiments for their ticket replies" ON public.reply_sentiments
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
    OR account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can do everything on reply_sentiments" ON public.reply_sentiments
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. Function to regenerate sentiment_trend_cache
-- ==============================================================================

CREATE OR REPLACE FUNCTION regenerate_sentiment_trend_cache(ticket_id_input uuid)
RETURNS jsonb AS $$
DECLARE
  trend_data jsonb;
BEGIN
  -- Get last 10 sentiments with timestamps for the ticket
  SELECT jsonb_agg(
    jsonb_build_object(
      'timestamp', stm.created_at,
      'sentiment', rs.sentiment,
      'score', rs.score,
      'keywords', rs.keywords
    )
    ORDER BY stm.created_at DESC
  )
  INTO trend_data
  FROM public.support_ticket_messages stm
  LEFT JOIN public.reply_sentiments rs ON stm.id = rs.reply_id
  WHERE stm.ticket_id = ticket_id_input
    AND stm.message_type = 'reply'
    AND rs.id IS NOT NULL
  LIMIT 10;

  RETURN COALESCE(trend_data, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 5. Function to detect negative trend and create event
-- ==============================================================================

CREATE OR REPLACE FUNCTION detect_negative_trend()
RETURNS TRIGGER AS $$
DECLARE
  negative_count integer;
  last_3_sentiments text[];
BEGIN
  -- Get last 3 consecutive sentiments for this ticket
  SELECT ARRAY_AGG(rs.sentiment ORDER BY rs.analyzed_at DESC)
  INTO last_3_sentiments
  FROM (
    SELECT rs.sentiment, rs.analyzed_at
    FROM public.reply_sentiments rs
    WHERE rs.ticket_id = NEW.ticket_id
    ORDER BY rs.analyzed_at DESC
    LIMIT 3
  ) rs;

  -- Check if all 3 are negative
  IF array_length(last_3_sentiments, 1) = 3
     AND last_3_sentiments[1] = 'negative'
     AND last_3_sentiments[2] = 'negative'
     AND last_3_sentiments[3] = 'negative' THEN

    -- Create negative trend event
    INSERT INTO public.ticket_events (ticket_id, event_type, created_by, payload)
    VALUES (NEW.ticket_id, 'negative_trend_detected', auth.uid(),
      jsonb_build_object('sentiment_count', 3, 'detected_at', now())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 6. Trigger to detect negative trends on sentiment insert
-- ==============================================================================

DROP TRIGGER IF EXISTS detect_negative_sentiment_trend ON public.reply_sentiments;

CREATE TRIGGER detect_negative_sentiment_trend
AFTER INSERT ON public.reply_sentiments
FOR EACH ROW
EXECUTE FUNCTION detect_negative_trend();

-- ==============================================================================
-- 7. View for tickets with stale sentiment cache (older than 24h)
-- ==============================================================================

CREATE OR REPLACE VIEW public.stale_sentiment_caches AS
SELECT
  st.id,
  st.title,
  st.status,
  st.assigned_to,
  st.sentiment_trend_cache_generated_at,
  EXTRACT(HOUR FROM (NOW() - st.sentiment_trend_cache_generated_at))::int as hours_since_generation
FROM public.support_tickets st
WHERE st.sentiment_trend_cache_generated_at IS NULL
   OR NOW() - st.sentiment_trend_cache_generated_at > INTERVAL '24 hours'
  AND st.status IN ('open', 'in_progress', 'resolved')
ORDER BY st.sentiment_trend_cache_generated_at ASC NULLS FIRST;

-- ==============================================================================
-- 8. Grant permissions
-- ==============================================================================

GRANT SELECT ON public.stale_sentiment_caches TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION regenerate_sentiment_trend_cache TO service_role;
GRANT EXECUTE ON FUNCTION detect_negative_trend TO service_role;
