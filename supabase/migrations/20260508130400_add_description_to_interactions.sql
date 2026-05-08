-- Objective: Add description to interactions for Voice of Customer

ALTER TABLE public.interactions
ADD COLUMN IF NOT EXISTS description text;

COMMENT ON COLUMN public.interactions.description IS 'Full description or transcription of the interaction';
