-- Migration: F1-16 SLA Escalation
-- Date: 2026-05-05
-- Objective: Track SLA violations and escalations to Slack

-- ==============================================================================
-- 1. Create sla_escalations table for tracking escalations
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sla_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  escalated_at timestamptz DEFAULT now(),
  sla_status text NOT NULL CHECK (sla_status IN ('atencao', 'vencido')),
  escalation_count int DEFAULT 1,
  last_escalated_at timestamptz DEFAULT now(),
  slack_message_ts text,
  slack_channel text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_escalations_ticket
ON public.sla_escalations(ticket_id);

CREATE INDEX IF NOT EXISTS idx_sla_escalations_escalated_at
ON public.sla_escalations(escalated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sla_escalations_sla_status
ON public.sla_escalations(sla_status);

-- ==============================================================================
-- 2. Enable RLS on sla_escalations
-- ==============================================================================

ALTER TABLE public.sla_escalations ENABLE ROW LEVEL SECURITY;

-- CSMs can view escalations for their tickets
CREATE POLICY "CSM can view escalations for their tickets" ON public.sla_escalations
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "Service role can do everything on sla_escalations" ON public.sla_escalations
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 3. Create sla_escalation_metrics table for telemetry/dashboard
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sla_escalation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_date date DEFAULT CURRENT_DATE,
  sla_status text NOT NULL CHECK (sla_status IN ('atencao', 'vencido')),
  escalation_count int DEFAULT 1,
  total_escalations int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_escalation_metrics_date
ON public.sla_escalation_metrics(escalation_date DESC);

CREATE INDEX IF NOT EXISTS idx_sla_escalation_metrics_status
ON public.sla_escalation_metrics(sla_status);

-- ==============================================================================
-- 4. Create aggregated escalation view for dashboard
-- ==============================================================================

CREATE OR REPLACE VIEW public.sla_escalation_summary AS
SELECT
  DATE_TRUNC('day', escalated_at)::date as escalation_date,
  sla_status,
  COUNT(*) as total_escalations,
  COUNT(DISTINCT ticket_id) as unique_tickets,
  COUNT(DISTINCT (
    SELECT assigned_to FROM public.support_tickets WHERE id = sla_escalations.ticket_id
  )) as affected_csms
FROM public.sla_escalations
WHERE escalated_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', escalated_at), sla_status
ORDER BY escalation_date DESC, sla_status;

-- ==============================================================================
-- 5. Add slack_webhook_sla_alerts env var note (configured at app level)
-- ==============================================================================

-- Note: SLACK_WEBHOOK_SLA_ALERTS environment variable should be set at deployment
-- Format: https://hooks.slack.com/services/T.../B.../XXXX
-- If not set, escalations are logged but not sent to Slack (graceful degradation)

-- ==============================================================================
-- 6. Create function to get SLA critical tickets (for escalation query)
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_sla_critical_tickets()
RETURNS TABLE (
  ticket_id uuid,
  ticket_title text,
  account_name text,
  assigned_csm_id uuid,
  assigned_csm_name text,
  priority text,
  sla_status text,
  hours_elapsed numeric,
  deadline_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.title,
    a.name,
    st.assigned_to,
    u.full_name,
    st.priority,
    CASE
      WHEN se.sla_status_resolution = 'vencido' THEN 'vencido'
      WHEN se.sla_status_resolution = 'atencao' THEN 'atencao'
      ELSE 'no_prazo'
    END,
    EXTRACT(EPOCH FROM (NOW() - st.created_at)) / 3600.0,
    se.deadline_resolution
  FROM public.support_tickets st
  LEFT JOIN public.sla_events se ON se.ticket_id = st.id
  LEFT JOIN public.accounts a ON a.id = st.account_id
  LEFT JOIN public.auth.users u ON u.id = st.assigned_to
  WHERE st.status != 'closed'
    AND (se.sla_status_resolution IN ('atencao', 'vencido'))
  ORDER BY se.deadline_resolution ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_sla_critical_tickets() TO authenticated, service_role;
