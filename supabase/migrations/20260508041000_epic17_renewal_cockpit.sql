-- Epic 17: Renewal Cockpit — 360° View + Negotiation History + PDF Generation

-- Story 17.4: Negotiation History
CREATE TABLE IF NOT EXISTS public.contract_negotiation_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  contract_id uuid NOT NULL REFERENCES public.contracts(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  date timestamptz NOT NULL DEFAULT now(),
  discount_offered_pct numeric DEFAULT 0,
  discount_accepted_pct numeric DEFAULT 0,
  main_objection text,
  closing_argument text,
  counterpart_name text,
  counterpart_role text,
  outcome text CHECK (outcome IN ('renewed', 'lost', 'pending')),
  notes text,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_contract_negotiation_history_contract_id ON public.contract_negotiation_history(contract_id);
CREATE INDEX idx_contract_negotiation_history_account_id ON public.contract_negotiation_history(account_id);
CREATE INDEX idx_contract_negotiation_history_date ON public.contract_negotiation_history(date);

ALTER TABLE public.contract_negotiation_history ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view negotiation history for their accounts"
  ON public.contract_negotiation_history FOR SELECT
  USING (account_id IN (
    SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
  ));

CREATE POLICY "Users can insert negotiation history for their accounts"
  ON public.contract_negotiation_history FOR INSERT
  WITH CHECK (account_id IN (
    SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
  ));

-- Update function for contract_negotiation_history.updated_at
CREATE OR REPLACE FUNCTION public.fn_update_contract_negotiation_history_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_contract_negotiation_history_updated_at ON public.contract_negotiation_history;
CREATE TRIGGER trigger_update_contract_negotiation_history_updated_at
  BEFORE UPDATE ON public.contract_negotiation_history
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_contract_negotiation_history_updated_at();

-- Optional: Add renewal_stage column to contracts to track: pre-negotiation, in-negotiation, closed
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS renewal_stage text DEFAULT 'not-started' CHECK (renewal_stage IN ('not-started', 'pre-negotiation', 'in-negotiation', 'closed'));

-- Optional: Add renewal_confidence column for renewal probability
ALTER TABLE public.contracts ADD COLUMN IF NOT EXISTS renewal_confidence numeric DEFAULT 0 CHECK (renewal_confidence >= 0 AND renewal_confidence <= 1);
