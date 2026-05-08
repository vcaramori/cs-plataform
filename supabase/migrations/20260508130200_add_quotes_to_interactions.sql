-- Objective: Add quotes to interactions for Voice of Customer

ALTER TABLE public.interactions
ADD COLUMN IF NOT EXISTS quotes text[];

COMMENT ON COLUMN public.interactions.quotes IS 'Memorable quotes extracted by Gemini';
