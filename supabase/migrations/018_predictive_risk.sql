-- 018_predictive_risk.sql
-- Epic 10: IA Preditiva de Risco e Churn

CREATE TABLE account_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('positive', 'neutral', 'negative', 'at-risk')),
    ai_reasoning TEXT NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for querying recent assessments by account
CREATE INDEX idx_account_risk_assessments_account_id_analyzed_at ON account_risk_assessments(account_id, analyzed_at DESC);

-- RLS
ALTER TABLE account_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Risk assessments are visible to users of the same company" ON account_risk_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = account_risk_assessments.account_id
      AND accounts.company_id = (SELECT company_id FROM users WHERE users.id = auth.uid())
    )
  );

CREATE POLICY "Risk assessments can be inserted by authenticated users (webhooks)" ON account_risk_assessments
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  );
