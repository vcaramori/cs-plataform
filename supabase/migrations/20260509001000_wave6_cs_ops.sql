-- Wave 6 — Epic 21: CS Ops Excellence
-- Capacity planning, territory rebalancing, burnout detection, scorecard, velocity

-- ==============================================================================
-- CSM CAPACITY (Workload and capacity metrics per CSM)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.csm_capacity (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  csm_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date           DATE        NOT NULL DEFAULT CURRENT_DATE,
  accounts_managed        INTEGER     NOT NULL DEFAULT 0,
  total_mrr               NUMERIC(12,2) NOT NULL DEFAULT 0,
  total_arr               NUMERIC(12,2) NOT NULL DEFAULT 0,
  avg_health_score        NUMERIC(5,2) DEFAULT 0,
  capacity_utilization_pct NUMERIC(5,2) DEFAULT 0, -- 0-100
  ideal_accounts_per_csm  INTEGER     DEFAULT 12,
  workload_status         TEXT        DEFAULT 'balanced' CHECK (workload_status IN ('underutilized', 'balanced', 'at_capacity', 'overloaded')),
  hours_allocated_weekly  NUMERIC(6,2) DEFAULT 40,
  hours_billable_weekly   NUMERIC(6,2) DEFAULT 0,
  hours_internal_weekly   NUMERIC(6,2) DEFAULT 0,
  billable_utilization_pct NUMERIC(5,2) DEFAULT 0, -- billable / allocated
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(csm_id, snapshot_date)
);

CREATE INDEX idx_capacity_csm ON public.csm_capacity(csm_id);
CREATE INDEX idx_capacity_date ON public.csm_capacity(snapshot_date DESC);

-- ==============================================================================
-- TERRITORY REBALANCING (Reassignment suggestions and history)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.territory_rebalancing (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  proposed_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  from_csm_id           UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  to_csm_id             UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  recommendation_score  NUMERIC(5,2) NOT NULL CHECK (recommendation_score >= 0 AND recommendation_score <= 1),
  rationale             TEXT        NOT NULL, -- Why this reassignment
  from_utilization_after NUMERIC(5,2), -- Predicted from CSM utilization after move
  to_utilization_after  NUMERIC(5,2), -- Predicted to CSM utilization after move
  status                TEXT        DEFAULT 'proposed' CHECK (status IN ('proposed', 'approved', 'executed', 'cancelled')),
  executed_at           TIMESTAMPTZ,
  approved_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_rebalance_account ON public.territory_rebalancing(account_id);
CREATE INDEX idx_rebalance_from_csm ON public.territory_rebalancing(from_csm_id);
CREATE INDEX idx_rebalance_to_csm ON public.territory_rebalancing(to_csm_id);
CREATE INDEX idx_rebalance_status ON public.territory_rebalancing(status);

-- ==============================================================================
-- CSM HEALTH (Burnout detection and team well-being)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.csm_health (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  csm_id                UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  snapshot_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  utilization_pct       NUMERIC(5,2) NOT NULL DEFAULT 0, -- Above 100% = overloaded
  avg_response_time_hrs NUMERIC(6,2) DEFAULT 0, -- Average time to respond to customer requests
  escalations_owned     INTEGER     DEFAULT 0, -- Active escalations managed
  avg_csat_score        NUMERIC(3,2), -- Customer satisfaction rating
  nps_scores_collected  INTEGER     DEFAULT 0,
  avg_nps_team          NUMERIC(4,1), -- Team average NPS
  burnout_risk_score    NUMERIC(3,2) DEFAULT 0, -- 0-1 risk score (>0.7 = high risk)
  burnout_indicators    TEXT[]      DEFAULT '{}', -- ['overutilized', 'high_escalations', 'low_csat', 'high_stress_signals']
  flagged_as_high_risk  BOOLEAN     DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(csm_id, snapshot_date)
);

CREATE INDEX idx_health_csm ON public.csm_health(csm_id);
CREATE INDEX idx_health_burnout_risk ON public.csm_health(burnout_risk_score DESC) WHERE flagged_as_high_risk = true;

-- ==============================================================================
-- CSM SCORECARD (Performance metrics and dashboard data)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.csm_scorecard (
  id                        UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  csm_id                    UUID        NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  period_start              DATE        NOT NULL,
  period_end                DATE        NOT NULL,
  accounts_managed          INTEGER     NOT NULL DEFAULT 0,
  total_mrr                 NUMERIC(12,2) NOT NULL DEFAULT 0,
  health_escalations_owned  INTEGER     DEFAULT 0,
  health_escalations_resolved INTEGER   DEFAULT 0,
  health_escalations_resolved_pct NUMERIC(5,2) DEFAULT 0,
  avg_health_managed_accounts NUMERIC(5,2) DEFAULT 0,
  avg_nps_managed_accounts  NUMERIC(4,1) DEFAULT 0,
  nps_surveys_completed    INTEGER     DEFAULT 0,
  avg_csat_score            NUMERIC(3,2) DEFAULT 0,
  csat_surveys_completed    INTEGER     DEFAULT 0,
  avg_trt_hours             NUMERIC(6,2) DEFAULT 0, -- Average time to resolution for tickets
  interactions_per_account  NUMERIC(5,2) DEFAULT 0, -- Engagement metric
  expansion_deals_closed    INTEGER     DEFAULT 0,
  expansion_value_closed    NUMERIC(12,2) DEFAULT 0,
  churn_rate                NUMERIC(5,2) DEFAULT 0, -- % of accounts churned
  renewals_closed           INTEGER     DEFAULT 0,
  renewal_rate_pct          NUMERIC(5,2) DEFAULT 0,
  overall_score             NUMERIC(5,2) DEFAULT 0, -- Composite score
  created_at                TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(csm_id, period_start, period_end)
);

CREATE INDEX idx_scorecard_csm ON public.csm_scorecard(csm_id);
CREATE INDEX idx_scorecard_period ON public.csm_scorecard(period_start, period_end);

-- ==============================================================================
-- TEAM VELOCITY (Throughput and momentum tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.team_velocity (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  period_start            DATE        NOT NULL,
  period_end              DATE        NOT NULL,
  week_number             INTEGER, -- ISO week number
  total_csms_active       INTEGER     NOT NULL DEFAULT 0,
  accounts_onboarded      INTEGER     DEFAULT 0,
  accounts_renewed        INTEGER     DEFAULT 0,
  accounts_churned        INTEGER     DEFAULT 0,
  expansion_deals         INTEGER     DEFAULT 0,
  expansion_total_value   NUMERIC(12,2) DEFAULT 0,
  avg_ttv_days            NUMERIC(6,2) DEFAULT 0, -- Average time-to-value (onboarding)
  health_improvements     INTEGER     DEFAULT 0, -- Accounts that improved health score
  health_regressions      INTEGER     DEFAULT 0, -- Accounts that declined
  ticket_volume_resolved  INTEGER     DEFAULT 0,
  avg_resolution_time_hrs NUMERIC(6,2) DEFAULT 0,
  team_utilization_pct    NUMERIC(5,2) DEFAULT 0, -- Team average
  team_burnout_count      INTEGER     DEFAULT 0, -- CSMs flagged as high burnout risk
  forecast_next_period    JSONB       DEFAULT '{}'::jsonb, -- {renewals_expected, expansion_potential}
  created_at              TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(period_start, period_end)
);

CREATE INDEX idx_velocity_period ON public.team_velocity(period_start, period_end);
CREATE INDEX idx_velocity_week ON public.team_velocity(week_number);
