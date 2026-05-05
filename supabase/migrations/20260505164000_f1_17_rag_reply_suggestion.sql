-- Migration: F1-17 RAG Reply Suggestion
-- Date: 2026-05-05
-- Objective: Add reply suggestion tables and tracking

-- ==============================================================================
-- 1. Create reply_suggestions table for tracking suggestions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reply_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  suggestion_text text NOT NULL,
  confidence float DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  sources text[], -- JSON array of referenced ticket IDs
  model_used text DEFAULT 'gemini-2.5-flash',
  generated_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  used_in_reply boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_suggestions_ticket
ON public.reply_suggestions(ticket_id);

CREATE INDEX IF NOT EXISTS idx_reply_suggestions_created
ON public.reply_suggestions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reply_suggestions_ticket_created
ON public.reply_suggestions(ticket_id, created_at DESC);

-- ==============================================================================
-- 2. Enable RLS on reply_suggestions
-- ==============================================================================

ALTER TABLE public.reply_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view suggestions for their tickets" ON public.reply_suggestions
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
    OR account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can do everything on reply_suggestions" ON public.reply_suggestions
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 3. Create reply_suggestion_cache for 5-min caching
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reply_suggestion_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL REFERENCES public.reply_suggestions(id) ON DELETE CASCADE,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reply_suggestion_cache_ticket
ON public.reply_suggestion_cache(ticket_id);

CREATE INDEX IF NOT EXISTS idx_reply_suggestion_cache_expires
ON public.reply_suggestion_cache(expires_at);

-- ==============================================================================
-- 4. Create reply_suggestion_telemetry for analytics
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reply_suggestion_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL REFERENCES public.reply_suggestions(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('accepted', 'rejected', 'edited')),
  action_at timestamptz DEFAULT now(),
  edit_distance int, -- Levenshtein distance if edited
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_suggestion_telemetry_action
ON public.reply_suggestion_telemetry(action);

CREATE INDEX IF NOT EXISTS idx_reply_suggestion_telemetry_created
ON public.reply_suggestion_telemetry(created_at DESC);

-- ==============================================================================
-- 5. Function to get similar tickets for RAG context
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_similar_tickets_for_rag(
  p_ticket_id uuid,
  p_limit int DEFAULT 5,
  p_threshold float DEFAULT 0.75
)
RETURNS TABLE (
  similar_ticket_id uuid,
  similar_ticket_title text,
  similarity_score float,
  latest_reply text,
  last_reply_at timestamptz,
  category text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.title,
    (e1.embedding <-> e2.embedding) as similarity, -- cosine distance
    (
      SELECT sle.metadata->>'body'
      FROM public.ticket_events sle
      WHERE sle.ticket_id = st.id
        AND sle.event_type IN ('reply', 'note')
      ORDER BY sle.occurred_at DESC
      LIMIT 1
    ) as latest_reply,
    (
      SELECT sle.occurred_at
      FROM public.ticket_events sle
      WHERE sle.ticket_id = st.id
        AND sle.event_type IN ('reply', 'note')
      ORDER BY sle.occurred_at DESC
      LIMIT 1
    ) as last_reply_at,
    st.category
  FROM public.support_tickets st
  JOIN public.embeddings e1 ON e1.resource_id = p_ticket_id AND e1.resource_type = 'support_ticket'
  JOIN public.embeddings e2 ON e2.resource_id = st.id AND e2.resource_type = 'support_ticket'
  WHERE st.id != p_ticket_id
    AND st.status IN ('resolved', 'closed')
    AND (e1.embedding <-> e2.embedding) <= (1 - p_threshold) -- similarity >= threshold
  ORDER BY (e1.embedding <-> e2.embedding) ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_similar_tickets_for_rag(uuid, int, float) TO authenticated, service_role;

-- ==============================================================================
-- 6. Function to invalidate reply suggestion cache on new reply
-- ==============================================================================

CREATE OR REPLACE FUNCTION invalidate_reply_suggestion_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.reply_suggestion_cache
  WHERE ticket_id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on ticket_events to invalidate cache when new reply arrives
-- Note: This will be created after ticket_events structure is verified
-- CREATE TRIGGER invalidate_reply_cache_on_new_reply
-- AFTER INSERT ON public.ticket_events
-- FOR EACH ROW
-- WHEN (NEW.event_type IN ('reply', 'note'))
-- EXECUTE FUNCTION invalidate_reply_suggestion_cache();
