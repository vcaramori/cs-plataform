-- Epic 16: CS Command Center — Priority Home + Daily Briefing + Meeting Prep

-- Story 16.1: Daily Home Priorities
CREATE TABLE IF NOT EXISTS public.daily_home_priorities (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  category text NOT NULL CHECK (category IN ('focar_agora', 'manter_momentum', 'oportunidade')),
  reason text NOT NULL,
  score numeric DEFAULT 0,
  action_type text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_daily_home_priorities_csm_id ON public.daily_home_priorities(csm_id);
CREATE INDEX idx_daily_home_priorities_created_at ON public.daily_home_priorities(created_at);
CREATE INDEX idx_daily_home_priorities_account_id ON public.daily_home_priorities(account_id);

ALTER TABLE public.daily_home_priorities ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own priorities"
  ON public.daily_home_priorities FOR SELECT
  USING (csm_id = auth.uid());

-- Story 16.2: Daily Briefing by AI
CREATE TABLE IF NOT EXISTS public.daily_briefings (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  csm_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  date date NOT NULL,
  priorities jsonb NOT NULL DEFAULT '{}'::jsonb,
  dismissed_at timestamptz,
  created_at timestamptz DEFAULT now(),
  UNIQUE(csm_id, date)
);

CREATE INDEX idx_daily_briefings_csm_id ON public.daily_briefings(csm_id);
CREATE INDEX idx_daily_briefings_date ON public.daily_briefings(date);

ALTER TABLE public.daily_briefings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own briefings"
  ON public.daily_briefings FOR SELECT
  USING (csm_id = auth.uid());

CREATE POLICY "Users can update their own briefings"
  ON public.daily_briefings FOR UPDATE
  USING (csm_id = auth.uid())
  WITH CHECK (csm_id = auth.uid());

-- Story 16.4: Meeting Prep Mode
CREATE TABLE IF NOT EXISTS public.meeting_prep (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  interaction_id uuid NOT NULL REFERENCES public.interactions(id) ON DELETE CASCADE,
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  csm_id uuid NOT NULL REFERENCES auth.users(id),
  agenda jsonb NOT NULL DEFAULT '{}'::jsonb,
  key_questions text[] DEFAULT ARRAY[]::text[],
  attention_points text[] DEFAULT ARRAY[]::text[],
  edited_agenda text,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_meeting_prep_interaction_id ON public.meeting_prep(interaction_id);
CREATE INDEX idx_meeting_prep_account_id ON public.meeting_prep(account_id);
CREATE INDEX idx_meeting_prep_csm_id ON public.meeting_prep(csm_id);

ALTER TABLE public.meeting_prep ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view meeting prep for their interactions"
  ON public.meeting_prep FOR SELECT
  USING (csm_id = auth.uid() OR account_id IN (
    SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
  ));

-- Update function for meeting_prep.updated_at
CREATE OR REPLACE FUNCTION public.fn_update_meeting_prep_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trigger_update_meeting_prep_updated_at ON public.meeting_prep;
CREATE TRIGGER trigger_update_meeting_prep_updated_at
  BEFORE UPDATE ON public.meeting_prep
  FOR EACH ROW
  EXECUTE FUNCTION public.fn_update_meeting_prep_updated_at();
