-- Log de importações do Read.ai: o que entrou, foi pulado, mesclado ou falhou.
-- Visível no admin (Configurações → Read.ai) para diagnóstico e auditoria.
CREATE TABLE IF NOT EXISTS public.readai_import_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id              uuid,
  user_id             uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  source              text NOT NULL DEFAULT 'cron',   -- connect | cron | manual | webhook
  external_meeting_id text,
  account_id          uuid REFERENCES public.accounts(id) ON DELETE SET NULL,
  title               text,
  meeting_date        date,
  action              text NOT NULL,                  -- created | updated | merged | skipped | error | possible_duplicate
  detail              text,
  created_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_readai_import_log_created   ON public.readai_import_log (created_at DESC);
CREATE INDEX IF NOT EXISTS idx_readai_import_log_user      ON public.readai_import_log (user_id, created_at DESC);

COMMENT ON TABLE public.readai_import_log IS 'Histórico de importações do Read.ai (sync/webhook): ação por reunião + motivo.';

-- RLS: leitura para liderança (admin/super_admin); escrita só via service role (admin client faz bypass).
ALTER TABLE public.readai_import_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  CREATE POLICY readai_import_log_select_leadership ON public.readai_import_log
    FOR SELECT TO authenticated
    USING (EXISTS (
      SELECT 1 FROM public.profiles p
      WHERE p.id = auth.uid() AND p.role IN ('admin', 'super_admin')
    ));
EXCEPTION WHEN duplicate_object THEN NULL; END $$;
