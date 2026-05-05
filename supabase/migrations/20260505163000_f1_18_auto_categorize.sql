-- Migration: F1-18 Auto-Categorization
-- Date: 2026-05-05
-- Objective: Add auto-categorization columns and tables

-- ==============================================================================
-- 1. Add columns to support_tickets for categorization suggestions
-- ==============================================================================

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS suggested_category text,
ADD COLUMN IF NOT EXISTS suggestion_confidence float DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS suggestion_reasoning text;

-- Add comments for clarity
COMMENT ON COLUMN public.support_tickets.suggested_category IS 'AI-suggested category: Bug, Feature Request, Account/Billing, Performance, Other';
COMMENT ON COLUMN public.support_tickets.suggestion_confidence IS 'Confidence score 0.0-1.0 for suggested category';
COMMENT ON COLUMN public.support_tickets.suggestion_reasoning IS 'Reasoning from IA for suggestion';

-- ==============================================================================
-- 2. Create categorization_suggestions table for audit/history
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.categorization_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  suggested_category text NOT NULL,
  confidence float NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  reasoning text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  auto_applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  applied_at timestamptz,
  applied_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_categorization_suggestions_ticket
ON public.categorization_suggestions(ticket_id);

CREATE INDEX IF NOT EXISTS idx_categorization_suggestions_status
ON public.categorization_suggestions(status);

CREATE INDEX IF NOT EXISTS idx_categorization_suggestions_created
ON public.categorization_suggestions(created_at DESC);

-- ==============================================================================
-- 3. Enable RLS on categorization_suggestions
-- ==============================================================================

ALTER TABLE public.categorization_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view suggestions for their tickets" ON public.categorization_suggestions
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
    OR account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can do everything on categorization_suggestions" ON public.categorization_suggestions
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. Create function to get categorization candidates (future extension)
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_pending_categorization_suggestions()
RETURNS TABLE (
  ticket_id uuid,
  ticket_title text,
  suggested_category text,
  confidence float,
  reasoning text,
  account_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.ticket_id,
    st.title,
    cs.suggested_category,
    cs.confidence,
    cs.reasoning,
    a.name
  FROM public.categorization_suggestions cs
  JOIN public.support_tickets st ON st.id = cs.ticket_id
  JOIN public.accounts a ON a.id = st.account_id
  WHERE cs.status = 'pending'
    AND cs.confidence < 0.75
  ORDER BY cs.created_at DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_pending_categorization_suggestions() TO authenticated, service_role;

-- ==============================================================================
-- 5. Add index for faster lookups by account and status
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_categorization_suggestions_ticket_status
ON public.categorization_suggestions(ticket_id, status);
