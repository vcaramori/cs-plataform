-- Migration: F1-11 Duplicate Detection, F1-12 Reopen Manual, F1-13 Public Form/Webhook
-- Date: 2026-05-05

-- ==============================================================================
-- 1. Add columns to support_tickets for public form and webhook support
-- ==============================================================================

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS source text DEFAULT 'manual' CHECK (source IN ('manual', 'form', 'webhook', 'email')),
ADD COLUMN IF NOT EXISTS external_id text,
ADD COLUMN IF NOT EXISTS created_via_form_at timestamptz;

CREATE INDEX IF NOT EXISTS idx_support_tickets_source ON public.support_tickets(source);
CREATE INDEX IF NOT EXISTS idx_support_tickets_external_id ON public.support_tickets(external_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_created_via_form_at ON public.support_tickets(created_via_form_at);

-- ==============================================================================
-- 2. Add external_id column to accounts for webhook account mapping
-- ==============================================================================

ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS external_id text UNIQUE;

CREATE INDEX IF NOT EXISTS idx_accounts_external_id ON public.accounts(external_id);

-- ==============================================================================
-- 3. Create webhook_deliveries table for tracking webhook ingestion
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  payload jsonb NOT NULL,
  response_status int,
  response_body text,
  attempt_count int DEFAULT 1,
  last_attempt_at timestamptz DEFAULT now(),
  success boolean DEFAULT false,
  error_message text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_account ON public.webhook_deliveries(account_id);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_success ON public.webhook_deliveries(success);
CREATE INDEX IF NOT EXISTS idx_webhook_deliveries_created_at ON public.webhook_deliveries(created_at DESC);

-- Enable RLS on webhook_deliveries
ALTER TABLE public.webhook_deliveries ENABLE ROW LEVEL SECURITY;

-- CSMs can view webhook deliveries for their accounts
CREATE POLICY "CSM can view webhook deliveries of their accounts" ON public.webhook_deliveries
FOR SELECT TO authenticated
USING (
  account_id IN (
    SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "Service role can do everything on webhook_deliveries" ON public.webhook_deliveries
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. Update RLS policies to include new tables
-- ==============================================================================

-- Ensure ticket_events policy includes manual_reopened events
-- (Policy already exists, just documenting the event_type)

-- Ensure ticket_similarity_candidates are properly scoped
-- (Already configured in previous migration)

-- ==============================================================================
-- 5. Create function for checking public form rate limits (optional enhancement)
-- ==============================================================================

-- CREATE OR REPLACE FUNCTION check_rate_limit(ip_address text, limit_count int DEFAULT 10)
-- RETURNS boolean AS $$
-- BEGIN
--   -- Implementation would go in Redis/application layer
--   RETURN true;
-- END;
-- $$ LANGUAGE plpgsql;

-- Note: Rate limiting is implemented in application layer for simplicity
