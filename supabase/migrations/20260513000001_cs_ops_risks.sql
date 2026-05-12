-- 20260513000001_cs_ops_risks.sql

CREATE TABLE public.account_risks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  identified_by UUID NOT NULL REFERENCES public.profiles(id),
  risk_type TEXT NOT NULL CHECK (risk_type IN ('churn', 'downgrade', 'adoption', 'relationship')),
  severity TEXT NOT NULL CHECK (severity IN ('low', 'medium', 'high', 'critical')),
  status TEXT NOT NULL DEFAULT 'identified' CHECK (status IN ('identified', 'mitigating', 'resolved')),
  description TEXT NOT NULL,
  action_plan TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- Rule: if severity is critical, action_plan should ideally not be null or empty
  -- However, we enforce this at the application level to allow draft states if needed, 
  -- but we can add a constraint if we want strict enforcement.
  -- For now, application level enforcement as per plan.
  CONSTRAINT check_critical_action_plan CHECK (
    (severity != 'critical') OR 
    (severity = 'critical' AND status = 'identified') OR
    (severity = 'critical' AND action_plan IS NOT NULL AND length(trim(action_plan)) > 0)
  )
);

-- Index for fast queries by account or status
CREATE INDEX idx_account_risks_account_id ON public.account_risks(account_id);
CREATE INDEX idx_account_risks_status ON public.account_risks(status);
CREATE INDEX idx_account_risks_severity ON public.account_risks(severity);

-- RLS
ALTER TABLE public.account_risks ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Enable read access for all authenticated users"
  ON public.account_risks FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Enable insert for authenticated users"
  ON public.account_risks FOR INSERT
  TO authenticated
  WITH CHECK (true);

CREATE POLICY "Enable update for creators and admins"
  ON public.account_risks FOR UPDATE
  TO authenticated
  USING (
    auth.uid() = identified_by OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'head_cs'))
  )
  WITH CHECK (
    auth.uid() = identified_by OR
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'head_cs'))
  );

CREATE POLICY "Enable delete for admins"
  ON public.account_risks FOR DELETE
  TO authenticated
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role IN ('admin', 'super_admin', 'head_cs'))
  );

-- Function to update account_risks.updated_at on change
CREATE OR REPLACE FUNCTION public.fn_update_account_risks_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

-- Trigger for updated_at
DROP TRIGGER IF EXISTS trigger_update_account_risks_updated_at ON public.account_risks;
CREATE TRIGGER trigger_update_account_risks_updated_at
  BEFORE UPDATE ON public.account_risks
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_account_risks_updated_at();
