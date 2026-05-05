-- Migration: F1-14 Queue with Capacity
-- Date: 2026-05-05
-- Objective: Add queue capacity tracking per CSM

-- ==============================================================================
-- 1. Add max_tickets_capacity column to csm_settings (if not exists)
-- ==============================================================================

ALTER TABLE public.csm_settings
ADD COLUMN IF NOT EXISTS max_tickets_capacity int DEFAULT 20 CHECK (max_tickets_capacity > 0);

CREATE INDEX IF NOT EXISTS idx_csm_settings_max_capacity ON public.csm_settings(max_tickets_capacity);

-- ==============================================================================
-- 2. Create materialized view csm_queue_stats for real-time queue statistics
-- ==============================================================================

CREATE OR REPLACE VIEW public.csm_queue_stats AS
SELECT
  u.id as csm_id,
  u.full_name as csm_name,
  u.email as csm_email,
  COALESCE(cs.max_tickets_capacity, 20) as max_capacity,
  COALESCE(COUNT(t.id), 0) as assigned_count,
  COALESCE(cs.max_tickets_capacity, 20) - COALESCE(COUNT(t.id), 0) as available_slots,
  ROUND(
    CASE
      WHEN COALESCE(cs.max_tickets_capacity, 20) = 0 THEN 0
      ELSE (COALESCE(COUNT(t.id), 0)::float / COALESCE(cs.max_tickets_capacity, 20)) * 100
    END,
    1
  ) as load_percentage,
  CASE u.active
    WHEN true THEN 'active'
    ELSE 'inactive'
  END as status
FROM public.auth.users u
LEFT JOIN public.csm_settings cs ON cs.user_id = u.id
LEFT JOIN public.support_tickets t ON t.assigned_to = u.id AND t.status != 'closed'
WHERE u.role = 'csm' OR (SELECT COUNT(*) FROM public.accounts WHERE csm_owner_id = u.id) > 0
GROUP BY u.id, u.full_name, u.email, cs.max_tickets_capacity, u.active
ORDER BY u.full_name;

-- ==============================================================================
-- 3. Enable RLS on csm_queue_stats (view doesn't need RLS, but data is safe)
-- ==============================================================================

-- Note: Views inherit RLS from underlying tables via the query itself
-- No explicit RLS policy needed for views as they're read-only aggregations

-- ==============================================================================
-- 4. Create index on support_tickets for efficient queue counting
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to_status
ON public.support_tickets(assigned_to, status);

-- ==============================================================================
-- 5. Add auto_assign_enabled flag to csm_settings (for F1-15)
-- ==============================================================================

ALTER TABLE public.csm_settings
ADD COLUMN IF NOT EXISTS auto_assign_enabled boolean DEFAULT true;

CREATE INDEX IF NOT EXISTS idx_csm_settings_auto_assign_enabled
ON public.csm_settings(auto_assign_enabled);
