-- Migration 009: NPS improvements
-- Adiciona: modo teste, programa default, período de vigência, nome amigável, flag is_test nas respostas

-- 1. Novas colunas em nps_programs
ALTER TABLE public.nps_programs
  ADD COLUMN IF NOT EXISTS name TEXT,
  ADD COLUMN IF NOT EXISTS is_test_mode BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS is_default  BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS active_from  TIMESTAMPTZ DEFAULT NULL,
  ADD COLUMN IF NOT EXISTS active_until TIMESTAMPTZ DEFAULT NULL;

-- 2. Flag que identifica respostas enviadas durante modo de teste (serão limpas ao desativar)
ALTER TABLE public.nps_responses
  ADD COLUMN IF NOT EXISTS is_test BOOLEAN NOT NULL DEFAULT false;

-- 3. Índices de performance
CREATE INDEX IF NOT EXISTS nps_programs_test_mode_idx
  ON public.nps_programs(is_test_mode) WHERE is_test_mode = true;

CREATE INDEX IF NOT EXISTS nps_programs_default_idx
  ON public.nps_programs(csm_owner_id, is_default) WHERE is_default = true;

CREATE INDEX IF NOT EXISTS nps_responses_is_test_idx
  ON public.nps_responses(is_test) WHERE is_test = true;

CREATE INDEX IF NOT EXISTS nps_responses_created_at_test_idx
  ON public.nps_responses(program_key, is_test, created_at DESC);
