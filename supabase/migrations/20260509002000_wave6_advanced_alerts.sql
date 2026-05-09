-- Wave 6 — Epic 22: Smart Alerts
-- Advanced alert system with predictive churn, anomaly detection, sentiment triggers

-- ==============================================================================
-- ALERTS (Core alert tracking)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.alerts (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  alert_type            TEXT        NOT NULL CHECK (alert_type IN (
    'churn_risk',
    'anomaly',
    'sentiment_trigger',
    'contract_risk',
    'adoption_cliff',
    'custom'
  )),
  severity              TEXT        NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status                TEXT        DEFAULT 'active' CHECK (status IN ('active', 'acknowledged', 'resolved', 'dismissed')),
  risk_score            NUMERIC(4,3) NOT NULL CHECK (risk_score >= 0 AND risk_score <= 1),
  risk_factors          JSONB       DEFAULT '[]'::jsonb, -- [{factor, weight, evidence}]
  recommended_action    TEXT        NOT NULL,
  metadata              JSONB       DEFAULT '{}'::jsonb, -- Alert-specific details
  triggered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  acknowledged_at       TIMESTAMPTZ,
  acknowledged_by       UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolved_at           TIMESTAMPTZ,
  resolved_by           UUID        REFERENCES auth.users(id) ON DELETE SET NULL,
  resolution_notes      TEXT,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_alerts_account ON public.alerts(account_id);
CREATE INDEX idx_alerts_type ON public.alerts(alert_type);
CREATE INDEX idx_alerts_severity ON public.alerts(severity);
CREATE INDEX idx_alerts_status ON public.alerts(status);
CREATE INDEX idx_alerts_risk_score ON public.alerts(risk_score DESC);
CREATE INDEX idx_alerts_triggered ON public.alerts(triggered_at DESC);

-- ==============================================================================
-- ALERT HISTORY (For tracking alert trends and anomaly detection)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.alert_history (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  alert_date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  total_alerts          INTEGER     DEFAULT 0,
  critical_alerts       INTEGER     DEFAULT 0,
  high_alerts           INTEGER     DEFAULT 0,
  churn_risk_alerts     INTEGER     DEFAULT 0,
  sentiment_alerts      INTEGER     DEFAULT 0,
  contract_risk_alerts  INTEGER     DEFAULT 0,
  adoption_cliff_alerts INTEGER     DEFAULT 0,
  anomaly_alerts        INTEGER     DEFAULT 0,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, alert_date)
);

CREATE INDEX idx_alert_history_account ON public.alert_history(account_id);
CREATE INDEX idx_alert_history_date ON public.alert_history(alert_date DESC);

-- ==============================================================================
-- CHURN RISK TRACKING (For 3-consecutive-day threshold detection)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.churn_risk_history (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  health_score          NUMERIC(5,2) NOT NULL,
  evaluation_date       DATE        NOT NULL DEFAULT CURRENT_DATE,
  below_threshold       BOOLEAN     DEFAULT false, -- health_score < 40
  consecutive_days      INTEGER     DEFAULT 0, -- Incremented when below threshold
  alert_triggered_at    TIMESTAMPTZ, -- When 3-day threshold was hit
  resolved_at           TIMESTAMPTZ, -- When health recovered above threshold
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, evaluation_date)
);

CREATE INDEX idx_churn_account ON public.churn_risk_history(account_id);
CREATE INDEX idx_churn_date ON public.churn_risk_history(evaluation_date DESC);
CREATE INDEX idx_churn_alert_triggered ON public.churn_risk_history(alert_triggered_at) WHERE alert_triggered_at IS NOT NULL;

-- ==============================================================================
-- ANOMALY DETECTION (Statistical outliers detection)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.anomaly_detection (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  metric_type           TEXT        NOT NULL CHECK (metric_type IN (
    'health_score',
    'nps',
    'ticket_volume',
    'response_time',
    'engagement',
    'adoption',
    'custom'
  )),
  metric_value          NUMERIC(12,4) NOT NULL,
  expected_value        NUMERIC(12,4), -- Baseline expectation
  std_deviation         NUMERIC(12,4), -- Standard deviation from baseline
  z_score               NUMERIC(6,2), -- Z-score: how many std devs away from mean
  is_outlier            BOOLEAN     DEFAULT false,
  anomaly_type          TEXT        CHECK (anomaly_type IN ('spike', 'drop', 'shift', 'trend')),
  severity              TEXT        CHECK (severity IN ('low', 'medium', 'high')),
  detection_date        DATE        NOT NULL DEFAULT CURRENT_DATE,
  explanation           TEXT, -- Why this is anomalous
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_anomaly_account ON public.anomaly_detection(account_id);
CREATE INDEX idx_anomaly_metric ON public.anomaly_detection(metric_type);
CREATE INDEX idx_anomaly_outlier ON public.anomaly_detection(is_outlier) WHERE is_outlier = true;
CREATE INDEX idx_anomaly_date ON public.anomaly_detection(detection_date DESC);

-- ==============================================================================
-- SENTIMENT TRIGGER EVENTS (NPS sentiment < -0.5)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.sentiment_trigger_events (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  nps_response_id       UUID, -- Link to NPS response if available
  sentiment_score       NUMERIC(4,3) NOT NULL CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  sentiment_text        TEXT, -- The feedback that triggered the alert
  triggered_threshold   NUMERIC(4,3) DEFAULT -0.5,
  severity              TEXT        DEFAULT 'medium' CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  alert_created         BOOLEAN     DEFAULT false,
  triggered_at          TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_sentiment_account ON public.sentiment_trigger_events(account_id);
CREATE INDEX idx_sentiment_score ON public.sentiment_trigger_events(sentiment_score) WHERE sentiment_score < -0.5;
CREATE INDEX idx_sentiment_triggered_at ON public.sentiment_trigger_events(triggered_at DESC);

-- ==============================================================================
-- CONTRACT RISK TRACKING (renewal < 30d AND health < 50)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.contract_risk_events (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  contract_id           UUID        NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  renewal_date          DATE        NOT NULL,
  days_until_renewal    INTEGER     NOT NULL,
  health_score          NUMERIC(5,2) NOT NULL,
  risk_score            NUMERIC(4,3) NOT NULL, -- Composite risk
  risk_factors          JSONB       DEFAULT '[]'::jsonb, -- {renewal_urgency, health_concern, nps, etc}
  mitigation_actions    JSONB       DEFAULT '[]'::jsonb, -- {action, owner, due_date}
  alert_created         BOOLEAN     DEFAULT false,
  evaluated_at          DATE        NOT NULL DEFAULT CURRENT_DATE,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, contract_id, evaluated_at)
);

CREATE INDEX idx_contract_risk_account ON public.contract_risk_events(account_id);
CREATE INDEX idx_contract_risk_renewal ON public.contract_risk_events(renewal_date);
CREATE INDEX idx_contract_risk_alert ON public.contract_risk_events(alert_created);

-- ==============================================================================
-- ADOPTION CLIFF DETECTION (> 20% drop in 7 days)
-- ==============================================================================
CREATE TABLE IF NOT EXISTS public.adoption_cliff_events (
  id                    UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id            UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  cliff_date            DATE        NOT NULL DEFAULT CURRENT_DATE,
  adoption_pct_7d_ago   NUMERIC(5,2) NOT NULL,
  adoption_pct_today    NUMERIC(5,2) NOT NULL,
  adoption_drop_pct     NUMERIC(5,2) NOT NULL, -- (7d_ago - today) / 7d_ago * 100
  cliff_detected        BOOLEAN     DEFAULT false, -- True if drop > 20%
  affected_features     UUID[]      DEFAULT '{}', -- Features with biggest drops
  usage_decline_details JSONB       DEFAULT '{}'::jsonb, -- {feature: drop_%, reason: inferred}
  alert_created         BOOLEAN     DEFAULT false,
  created_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  UNIQUE(account_id, cliff_date)
);

CREATE INDEX idx_cliff_account ON public.adoption_cliff_events(account_id);
CREATE INDEX idx_cliff_detected ON public.adoption_cliff_events(cliff_detected) WHERE cliff_detected = true;
CREATE INDEX idx_cliff_date ON public.adoption_cliff_events(cliff_date DESC);
