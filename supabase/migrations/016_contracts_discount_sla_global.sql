-- Migration 016: discount type on contracts + global SLA policy support

-- 1. Add discount type/value to contracts
ALTER TABLE public.contracts
  ADD COLUMN discount_type TEXT NOT NULL DEFAULT 'percentage' CHECK (discount_type IN ('percentage', 'fixed')),
  ADD COLUMN discount_value_brl NUMERIC(12,2) NOT NULL DEFAULT 0 CHECK (discount_value_brl >= 0);

-- 2. Make sla_policies support a global (non-account) policy
ALTER TABLE public.sla_policies
  ALTER COLUMN account_id DROP NOT NULL,
  ALTER COLUMN contract_id DROP NOT NULL,
  ADD COLUMN is_global BOOLEAN NOT NULL DEFAULT false;

-- Enforce: global policies have no account/contract; per-account policies require both
ALTER TABLE public.sla_policies
  ADD CONSTRAINT sla_policies_global_or_account CHECK (
    (is_global = true AND account_id IS NULL AND contract_id IS NULL)
    OR
    (is_global = false AND account_id IS NOT NULL AND contract_id IS NOT NULL)
  );

-- Only one global policy allowed
CREATE UNIQUE INDEX idx_sla_policies_single_global ON public.sla_policies(is_global) WHERE is_global = true;

-- 3. Track whether a contract SLA uses the global standard or a custom mapping
ALTER TABLE public.sla_policies
  ADD COLUMN use_global_standard BOOLEAN NOT NULL DEFAULT true;

-- 4. Seed the global SLA policy with default levels
WITH inserted AS (
  INSERT INTO public.sla_policies (is_global, use_global_standard, alert_threshold_pct, auto_close_hours, timezone)
  VALUES (true, false, 25, 48, 'America/Sao_Paulo')
  RETURNING id
)
INSERT INTO public.sla_policy_levels (policy_id, level, first_response_minutes, resolution_minutes)
SELECT id, level, first_response_minutes, resolution_minutes
FROM inserted, (VALUES
  ('critical', 30,   240),
  ('high',     120,  480),
  ('medium',   240,  1440),
  ('low',      480,  2880)
) AS defaults(level, first_response_minutes, resolution_minutes);
