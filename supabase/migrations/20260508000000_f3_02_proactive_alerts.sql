-- F3-02: Proactive Alerts Engine
-- Creates alert types, severity levels, and alert tracking tables with RLS

-- Create enum types
CREATE TYPE alert_type AS ENUM (
  'churn_risk',
  'silent_customer',
  'renewal_upcoming',
  'adoption_anomaly',
  'expansion_signal',
  'nps_detractor_unactioned'
);

CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');

-- Create proactive_alerts table
CREATE TABLE proactive_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraint único: 1 alerta ativo por (account_id, type)
CREATE UNIQUE INDEX proactive_alerts_daily_uniq
  ON proactive_alerts(account_id, type)
  WHERE resolved_at IS NULL;


-- Índices para queries rápidas
CREATE INDEX idx_proactive_alerts_account_id ON proactive_alerts(account_id);
CREATE INDEX idx_proactive_alerts_severity ON proactive_alerts(severity);
CREATE INDEX idx_proactive_alerts_created_at ON proactive_alerts(created_at DESC);
CREATE INDEX idx_proactive_alerts_type ON proactive_alerts(type);
CREATE INDEX idx_proactive_alerts_resolved ON proactive_alerts(resolved_at);

-- Enable RLS
ALTER TABLE proactive_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "CSM sees own account alerts"
  ON proactive_alerts FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "CSM updates own account alerts"
  ON proactive_alerts FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE csm_owner_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON proactive_alerts TO authenticated;
GRANT SELECT, UPDATE ON proactive_alerts TO authenticated;
