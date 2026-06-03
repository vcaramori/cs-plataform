-- Migration: create user_integrations table

CREATE TABLE IF NOT EXISTS public.user_integrations (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  provider text NOT NULL, -- e.g., 'microsoft_office365'
  access_token text,      -- ENCRYPTED using same key as LLM
  refresh_token text,     -- ENCRYPTED
  token_expires_at timestamptz,
  created_at timestamptz DEFAULT now() NOT NULL,
  updated_at timestamptz DEFAULT now() NOT NULL,
  UNIQUE(user_id, provider)
);

-- RLS
ALTER TABLE public.user_integrations ENABLE ROW LEVEL SECURITY;

-- users can read/update their own integrations
CREATE POLICY "Users can view own integrations"
  ON public.user_integrations
  FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "Users can insert own integrations"
  ON public.user_integrations
  FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update own integrations"
  ON public.user_integrations
  FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "Users can delete own integrations"
  ON public.user_integrations
  FOR DELETE
  USING (auth.uid() = user_id);

-- super_admin and leadership might need to select via service role or admin client.
-- Admin bypasses RLS anyway.

-- function for updated_at
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_user_integrations_updated_at
  BEFORE UPDATE ON public.user_integrations
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();
