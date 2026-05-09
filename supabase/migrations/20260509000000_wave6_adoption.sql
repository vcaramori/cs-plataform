-- Wave 6 — Epic 19: Adoption Intelligence
-- Features, adoption tracking, forecasts, dependency graphs

-- ==============================================================================
-- FEATURES (Product features for adoption tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.features (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT        NOT NULL UNIQUE,
  description       TEXT,
  category          TEXT        NOT NULL CHECK (category IN ('core', 'advanced', 'enterprise', 'beta')),
  launch_date       DATE        NOT NULL,
  tier              TEXT        NOT NULL CHECK (tier IN ('Basic', 'Professional', 'Enterprise')),
  is_active         BOOLEAN     NOT NULL DEFAULT true,
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_features_category ON public.features(category);
CREATE INDEX idx_features_tier ON public.features(tier);

-- ==============================================================================
-- FEATURE DEPENDENCIES (DAG: directed acyclic graph)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.feature_dependencies (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  feature_id        UUID        NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  depends_on_id     UUID        NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  relationship_type TEXT        NOT NULL CHECK (relationship_type IN ('requires', 'enables', 'recommends')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT no_self_dep CHECK (feature_id != depends_on_id),
  UNIQUE(feature_id, depends_on_id, relationship_type)
);

CREATE INDEX idx_feature_deps_feature ON public.feature_dependencies(feature_id);
CREATE INDEX idx_feature_deps_depends_on ON public.feature_dependencies(depends_on_id);

-- ==============================================================================
-- ACCOUNT FEATURE ADOPTION (Adoption tracking per account)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.account_feature_adoption (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  feature_id            UUID        NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  adoption_status       TEXT        NOT NULL DEFAULT 'not_started' CHECK (adoption_status IN ('not_started', 'in_progress', 'adopted', 'abandoned')),
  adoption_pct          NUMERIC(5,2) DEFAULT 0 CHECK (adoption_pct >= 0 AND adoption_pct <= 100),
  last_usage_date       DATE,
  first_adoption_date   DATE,
  adoption_velocity     NUMERIC(5,2), -- Usage per week (trend)
  blockers_identified   JSONB       DEFAULT '[]'::jsonb, -- [{type, severity, description}]
  usage_metrics         JSONB       DEFAULT '{}'::jsonb, -- {weekly_active_users, logins, sessions, etc}
  updated_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, feature_id)
);

CREATE INDEX idx_adoption_account ON public.account_feature_adoption(account_id);
CREATE INDEX idx_adoption_feature ON public.account_feature_adoption(feature_id);
CREATE INDEX idx_adoption_status ON public.account_feature_adoption(adoption_status);

-- ==============================================================================
-- ADOPTION ANALYSIS (Daily snapshots for forecasting)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.adoption_analysis (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  analysis_date         DATE        NOT NULL DEFAULT CURRENT_DATE,
  feature_count_total   INTEGER     NOT NULL DEFAULT 0,
  feature_count_adopted INTEGER     NOT NULL DEFAULT 0,
  overall_adoption_pct  NUMERIC(5,2) NOT NULL DEFAULT 0,
  adoption_trend        TEXT        DEFAULT 'stable' CHECK (adoption_trend IN ('accelerating', 'stable', 'declining')),
  flagged_blockers      TEXT[]      DEFAULT '{}', -- Top 3 blockers
  forecast_90d          NUMERIC(5,2), -- ML forecast for adoption % in 90 days
  forecast_confidence   NUMERIC(3,2), -- 0-1 confidence score
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, analysis_date)
);

CREATE INDEX idx_analysis_account ON public.adoption_analysis(account_id);
CREATE INDEX idx_analysis_date ON public.adoption_analysis(analysis_date DESC);

-- ==============================================================================
-- FEATURE BLOCKER DETECTION (Root cause analysis)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.feature_blockers (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  feature_id            UUID        NOT NULL REFERENCES public.features(id) ON DELETE CASCADE,
  blocker_type          TEXT        NOT NULL CHECK (blocker_type IN ('technical', 'training', 'organizational', 'business', 'other')),
  severity              TEXT        NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  description           TEXT        NOT NULL,
  root_cause_analysis   JSONB       DEFAULT '{}'::jsonb, -- {factors: [], recommendations: []}
  detected_at           TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  resolved_at           TIMESTAMPTZ,
  detection_source      TEXT        CHECK (detection_source IN ('usage_metrics', 'support_tickets', 'interview', 'system_inference')),
  UNIQUE(account_id, feature_id, detection_source) NULLS NOT DISTINCT
);

CREATE INDEX idx_blockers_account ON public.feature_blockers(account_id);
CREATE INDEX idx_blockers_feature ON public.feature_blockers(feature_id);
CREATE INDEX idx_blockers_severity ON public.feature_blockers(severity);
CREATE INDEX idx_blockers_resolved ON public.feature_blockers(resolved_at) WHERE resolved_at IS NULL;
