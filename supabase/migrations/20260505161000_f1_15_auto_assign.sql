-- Migration: F1-15 Auto-assign Tickets
-- Date: 2026-05-05
-- Objective: Enable automatic ticket assignment based on CSM queue capacity

-- Note: Tables created in 20260505160000_f1_14_queue_capacity.sql
-- This migration ensures auto_assign_enabled flag is present and adds telemetry table

-- ==============================================================================
-- 1. Create auto_assign_stats table for telemetry
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.auto_assign_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  assigned_to_csm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,

  previous_assigned_to uuid,
  assigned_at timestamptz DEFAULT now(),
  capacity_before int NOT NULL,
  capacity_after int NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_assign_stats_ticket
ON public.auto_assign_stats(assigned_ticket_id);

CREATE INDEX IF NOT EXISTS idx_auto_assign_stats_csm
ON public.auto_assign_stats(assigned_to_csm_id);

CREATE INDEX IF NOT EXISTS idx_auto_assign_stats_created_at
ON public.auto_assign_stats(created_at DESC);

-- ==============================================================================
-- 2. Enable RLS on auto_assign_stats
-- ==============================================================================

ALTER TABLE public.auto_assign_stats ENABLE ROW LEVEL SECURITY;

-- CSMs can view auto-assignment stats for their own tickets
CREATE POLICY "CSM can view auto-assign stats for their tickets" ON public.auto_assign_stats
FOR SELECT TO authenticated
USING (
  assigned_ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "Service role can do everything on auto_assign_stats" ON public.auto_assign_stats
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 3. Create hourly aggregation view for dashboard telemetry
-- ==============================================================================

CREATE OR REPLACE VIEW public.auto_assign_metrics AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_auto_assigned,
  COUNT(DISTINCT assigned_to_csm_id) as csms_involved,
  AVG(capacity_before)::int as avg_capacity_before,
  AVG(capacity_after)::int as avg_capacity_after
FROM public.auto_assign_stats
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ==============================================================================
-- 4. Ensure auto_assign_enabled flag exists in csm_settings
-- ==============================================================================

-- Already added in F1-14 migration (20260505160000)
-- This is a safeguard in case migrations run out of order

ALTER TABLE public.csm_settings
ADD COLUMN IF NOT EXISTS auto_assign_enabled boolean DEFAULT true;
