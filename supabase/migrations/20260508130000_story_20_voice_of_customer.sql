-- Objective: Support Voice of Customer (Sentiment & Themes)
-- AC 1: Update interaction table with sentiment_score
-- AC 1: Create interaction_themes table

-- 1. Add sentiment_score to interactions
ALTER TABLE public.interactions
ADD COLUMN IF NOT EXISTS sentiment_score numeric;

COMMENT ON COLUMN public.interactions.sentiment_score IS 'Sentiment score extracted by Gemini (-1 to 1)';

-- 2. Create interaction_themes table
CREATE TABLE IF NOT EXISTS public.interaction_themes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
  theme text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Indices
CREATE INDEX IF NOT EXISTS idx_interaction_themes_interaction_id ON public.interaction_themes(interaction_id);
CREATE INDEX IF NOT EXISTS idx_interaction_themes_theme ON public.interaction_themes(theme);

-- RLS Policies
ALTER TABLE public.interaction_themes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view themes for their accounts"
ON public.interaction_themes
FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.interactions i
    JOIN public.accounts a ON i.account_id = a.id
    WHERE i.id = public.interaction_themes.interaction_id
    AND a.csm_owner_id = auth.uid()
  )
);

CREATE POLICY "Service role can do everything on interaction_themes"
ON public.interaction_themes
USING (true)
WITH CHECK (true);
