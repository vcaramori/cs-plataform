-- Migration: F1-19 Ticket Summary
-- Date: 2026-05-05
-- Objective: Add ticket summary generation and caching

-- ==============================================================================
-- 1. Add columns to support_tickets for summary caching
-- ==============================================================================

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS summary_generated_at timestamptz;

COMMENT ON COLUMN public.support_tickets.summary IS 'AI-generated 1-2 sentence summary (max 150 chars)';
COMMENT ON COLUMN public.support_tickets.summary_generated_at IS 'Timestamp when summary was last generated (cache validation)';

-- ==============================================================================
-- 2. Create ticket_summary_cache table for invalidation tracking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_summary_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  stale boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_cache_ticket
ON public.ticket_summary_cache(ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_cache_stale
ON public.ticket_summary_cache(stale);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_cache_expires
ON public.ticket_summary_cache(expires_at);

-- ==============================================================================
-- 3. Enable RLS on ticket_summary_cache
-- ==============================================================================

ALTER TABLE public.ticket_summary_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view summary cache for their tickets" ON public.ticket_summary_cache
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
    OR account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can do everything on ticket_summary_cache" ON public.ticket_summary_cache
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. Create ticket_summary_history table for audit trail
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_summary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  generated_by text DEFAULT 'ai', -- 'ai' or 'manual'
  regenerated_at timestamptz DEFAULT now(),
  regenerated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_history_ticket
ON public.ticket_summary_history(ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_history_regenerated
ON public.ticket_summary_history(regenerated_at DESC);

-- ==============================================================================
-- 5. Function to mark summary as stale (called when new reply arrives)
-- ==============================================================================

CREATE OR REPLACE FUNCTION mark_summary_as_stale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ticket_summary_cache
  SET stale = true
  WHERE ticket_id = NEW.ticket_id;

  UPDATE public.support_tickets
  SET summary = NULL,
      summary_generated_at = NULL
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger will be created after ticket_events structure is verified
-- CREATE TRIGGER mark_summary_stale_on_new_reply
-- AFTER INSERT ON public.ticket_events
-- FOR EACH ROW
-- WHEN (NEW.event_type IN ('reply'))
-- EXECUTE FUNCTION mark_summary_as_stale();

-- ==============================================================================
-- 6. View for stale summaries needing regeneration
-- ==============================================================================

CREATE OR REPLACE VIEW public.stale_ticket_summaries AS
SELECT
  st.id,
  st.title,
  st.status,
  st.assigned_to,
  tsc.summary_text,
  tsc.generated_at,
  EXTRACT(HOUR FROM (NOW() - tsc.generated_at))::int as hours_since_generation
FROM public.support_tickets st
LEFT JOIN public.ticket_summary_cache tsc ON st.id = tsc.ticket_id
WHERE st.status IN ('open', 'in_progress')
  AND (st.summary_generated_at IS NULL OR NOW() - st.summary_generated_at > INTERVAL '24 hours' OR tsc.stale = true)
ORDER BY st.opened_at DESC;

-- ==============================================================================
-- 7. Grant permissions
-- ==============================================================================

GRANT SELECT ON public.stale_ticket_summaries TO authenticated, service_role;
