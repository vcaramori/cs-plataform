-- Migration: F2-02 Weighted Health Score v2
-- Date: 2026-05-07
-- Objective: Add health_score_v2 with ponderada calculation (SLA 35%, NPS 30%, Adoption 25%, Relationship 10%)

-- ==============================================================================
-- 1. Add columns to accounts table for health_score_v2
-- ==============================================================================

ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS health_score_v2 numeric DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS health_breakdown jsonb,
ADD COLUMN IF NOT EXISTS health_classified_at timestamptz,
ADD COLUMN IF NOT EXISTS health_status varchar CHECK (health_status IN ('healthy', 'at-risk', 'critical'));

COMMENT ON COLUMN public.accounts.health_score_v2 IS 'Weighted health score v2: (SLA*0.35) + (NPS*0.30) + (Adoption*0.25) + (Relationship*0.10)';
COMMENT ON COLUMN public.accounts.health_breakdown IS 'JSON object with score breakdown: {sla, nps, adoption, relationship}';
COMMENT ON COLUMN public.accounts.health_classified_at IS 'Timestamp when health_status was last calculated';
COMMENT ON COLUMN public.accounts.health_status IS 'Classification: healthy (>=75), at-risk (50-74), critical (<50)';

-- ==============================================================================
-- 2. Create indices for health_score_v2 queries
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_accounts_health_score_v2
ON public.accounts(health_score_v2);

CREATE INDEX IF NOT EXISTS idx_accounts_health_status
ON public.accounts(health_status);

CREATE INDEX IF NOT EXISTS idx_accounts_health_classified_at
ON public.accounts(health_classified_at DESC);

-- GIN index for JSONB health_breakdown queries
CREATE INDEX IF NOT EXISTS idx_accounts_health_breakdown
ON public.accounts USING GIN(health_breakdown);

-- ==============================================================================
-- 3. RLS Policies for health_score_v2
-- ==============================================================================

-- CSM can view health_score_v2 for their accounts
CREATE POLICY IF NOT EXISTS "CSM can view health_score_v2 for their accounts"
ON public.accounts
FOR SELECT TO authenticated
USING (csm_owner_id = auth.uid());

-- Service role can update health_score_v2 (for cron)
CREATE POLICY IF NOT EXISTS "Service role can update health_score_v2"
ON public.accounts
FOR UPDATE TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 4. Function to calculate SLA Score
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_sla_score(account_id_input uuid)
RETURNS numeric AS $$
DECLARE
  resolved_on_time integer;
  total_resolved integer;
  sla_score numeric;
BEGIN
  -- Count tickets resolved within SLA in last 30 days
  SELECT
    COUNT(CASE WHEN (resolved_at - due_date) <= INTERVAL '0 seconds' THEN 1 END),
    COUNT(*)
  INTO resolved_on_time, total_resolved
  FROM public.support_tickets
  WHERE account_id = account_id_input
    AND resolved_at IS NOT NULL
    AND resolved_at >= NOW() - INTERVAL '30 days';

  IF total_resolved = 0 THEN
    RETURN 50.0; -- Default if no resolved tickets
  END IF;

  sla_score := (resolved_on_time::numeric / total_resolved::numeric) * 100.0;
  RETURN ROUND(LEAST(100, GREATEST(0, sla_score)), 2);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 5. Function to calculate NPS Score (normalized)
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_nps_score(account_id_input uuid)
RETURNS numeric AS $$
DECLARE
  avg_nps numeric;
  nps_score numeric;
BEGIN
  -- Get average NPS from responses in last 90 days
  SELECT AVG(score::numeric)
  INTO avg_nps
  FROM public.nps_responses
  WHERE account_id = account_id_input
    AND created_at >= NOW() - INTERVAL '90 days';

  IF avg_nps IS NULL THEN
    RETURN 50.0; -- Default if no NPS data
  END IF;

  -- Normalize to 0-100 scale: (avgNPS + 100) / 2
  -- NPS ranges from -100 to 100, so normalized ranges from 0 to 100
  nps_score := ((avg_nps + 100.0) / 2.0);
  RETURN ROUND(LEAST(100, GREATEST(0, nps_score)), 2);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 6. Function to calculate Adoption Score
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_adoption_score(account_id_input uuid)
RETURNS numeric AS $$
DECLARE
  adoption_data jsonb;
  active_features integer;
  total_features integer;
  adoption_score numeric;
BEGIN
  -- Get latest adoption metrics
  SELECT adoption_metrics
  INTO adoption_data
  FROM public.adoption_metrics
  WHERE account_id = account_id_input
  ORDER BY created_at DESC
  LIMIT 1;

  IF adoption_data IS NULL THEN
    RETURN 50.0; -- Default if no adoption data
  END IF;

  -- Extract active and total features from JSONB
  active_features := COALESCE((adoption_data->>'active_features')::integer, 0);
  total_features := COALESCE((adoption_data->>'total_features')::integer, 1);

  IF total_features = 0 THEN
    RETURN 50.0;
  END IF;

  adoption_score := (active_features::numeric / total_features::numeric) * 100.0;
  RETURN ROUND(LEAST(100, GREATEST(0, adoption_score)), 2);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 7. Function to calculate Relationship Score (interaction frequency)
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_relationship_score(account_id_input uuid)
RETURNS numeric AS $$
DECLARE
  interaction_count integer;
  days_since_last integer;
  relationship_score numeric;
BEGIN
  -- Count interactions in last 30 days
  SELECT COUNT(*)
  INTO interaction_count
  FROM public.interactions
  WHERE account_id = account_id_input
    AND date >= NOW() - INTERVAL '30 days';

  -- Get days since last interaction
  SELECT EXTRACT(DAY FROM (NOW() - MAX(date)))::integer
  INTO days_since_last
  FROM public.interactions
  WHERE account_id = account_id_input
    AND date >= NOW() - INTERVAL '30 days';

  -- Score based on frequency buckets
  IF days_since_last IS NULL THEN
    relationship_score := 0.0; -- No interactions in 30 days
  ELSIF days_since_last <= 7 THEN
    relationship_score := 100.0;
  ELSIF days_since_last <= 14 THEN
    relationship_score := 75.0;
  ELSIF days_since_last <= 21 THEN
    relationship_score := 50.0;
  ELSIF days_since_last <= 30 THEN
    relationship_score := 25.0;
  ELSE
    relationship_score := 0.0;
  END IF;

  RETURN ROUND(relationship_score, 2);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 8. Function to calculate Weighted Health Score v2
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_weighted_health_score(
  sla_score numeric,
  nps_score numeric,
  adoption_score numeric,
  relationship_score numeric
)
RETURNS jsonb AS $$
DECLARE
  weighted_score numeric;
  health_status varchar;
  result jsonb;
BEGIN
  -- Weighted calculation: SLA 35%, NPS 30%, Adoption 25%, Relationship 10%
  weighted_score := (sla_score * 0.35) + (nps_score * 0.30) + (adoption_score * 0.25) + (relationship_score * 0.10);
  weighted_score := ROUND(LEAST(100, GREATEST(0, weighted_score)), 2);

  -- Classify health status
  IF weighted_score >= 75 THEN
    health_status := 'healthy';
  ELSIF weighted_score >= 50 THEN
    health_status := 'at-risk';
  ELSE
    health_status := 'critical';
  END IF;

  -- Build result JSON
  result := jsonb_build_object(
    'score', weighted_score,
    'status', health_status,
    'breakdown', jsonb_build_object(
      'sla', sla_score,
      'nps', nps_score,
      'adoption', adoption_score,
      'relationship', relationship_score
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 9. Grants for functions
-- ==============================================================================

GRANT EXECUTE ON FUNCTION calc_sla_score TO service_role;
GRANT EXECUTE ON FUNCTION calc_nps_score TO service_role;
GRANT EXECUTE ON FUNCTION calc_adoption_score TO service_role;
GRANT EXECUTE ON FUNCTION calc_relationship_score TO service_role;
GRANT EXECUTE ON FUNCTION calc_weighted_health_score TO service_role;
