-- Migration: Create csm_settings table
-- Date: 2026-05-05 (Faked to run before F1-14)
-- Objective: Create the missing csm_settings table referenced by later migrations

CREATE TABLE IF NOT EXISTS public.csm_settings (
  user_id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  max_tickets_capacity INT DEFAULT 20 CHECK (max_tickets_capacity > 0),
  auto_assign_enabled BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Index for user_id
CREATE INDEX IF NOT EXISTS idx_csm_settings_user_id ON public.csm_settings(user_id);
