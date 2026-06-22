-- Snapshot diário de adoção por conta (alimenta tendência/forecast do analytics).
-- Fonte: feature_adoption (status por feature) + fórmula do Score de Adoção real.
CREATE TABLE IF NOT EXISTS public.adoption_analysis (
  id                    uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id            uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  analysis_date         date NOT NULL DEFAULT CURRENT_DATE,
  feature_count_total   integer NOT NULL DEFAULT 0,
  feature_count_adopted integer NOT NULL DEFAULT 0,
  overall_adoption_pct  integer NOT NULL DEFAULT 0,
  adoption_trend        text,                       -- accelerating | stable | declining
  created_at            timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT adoption_analysis_account_day_uniq UNIQUE (account_id, analysis_date)
);

CREATE INDEX IF NOT EXISTS idx_adoption_analysis_account ON public.adoption_analysis (account_id, analysis_date DESC);

COMMENT ON TABLE public.adoption_analysis IS 'Snapshot diário de adoção por conta (cron adoption-analysis): total/adotadas/pct/tendência.';

ALTER TABLE public.adoption_analysis ENABLE ROW LEVEL SECURITY;

-- Leitura para liderança (admin/super_admin) e para o dono da conta (csm_owner). Escrita via service role (bypass RLS).
DO $$ BEGIN
  CREATE POLICY adoption_analysis_select ON public.adoption_analysis
    FOR SELECT TO authenticated
    USING (
      EXISTS (SELECT 1 FROM public.profiles p WHERE p.id = auth.uid() AND p.role IN ('admin','super_admin'))
      OR EXISTS (SELECT 1 FROM public.accounts a WHERE a.id = adoption_analysis.account_id AND a.csm_owner_id = auth.uid())
    );
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
