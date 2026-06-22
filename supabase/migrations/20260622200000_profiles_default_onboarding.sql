-- Migration: Add default_onboarding_effort flag to profiles
ALTER TABLE public.profiles
ADD COLUMN IF NOT EXISTS default_onboarding_effort BOOLEAN NOT NULL DEFAULT false;

COMMENT ON COLUMN public.profiles.default_onboarding_effort IS 'Quando verdadeiro, os esforcos importados deste usuario (ex: via Read.ai) serao flagados automaticamente como onboarding.';
