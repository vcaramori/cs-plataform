-- Migration 007: NPS (Net Promoter Score) Engine
-- Tabelas para pesquisa de NPS embutida em instâncias de clientes

-- Programas de NPS por conta (configurações)
CREATE TABLE IF NOT EXISTS public.nps_programs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  program_key TEXT NOT NULL UNIQUE DEFAULT encode(gen_random_bytes(16), 'hex'),
  question TEXT NOT NULL DEFAULT 'Qual a probabilidade de você recomendar o Plannera a um amigo ou colega?',
  open_question TEXT NOT NULL DEFAULT 'Qual o motivo da sua nota?',
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  recurrence_days INT NOT NULL DEFAULT 90,
  dismiss_days INT NOT NULL DEFAULT 30,
  account_recurrence_days INT NOT NULL DEFAULT 30,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Respostas individuais de NPS
CREATE TABLE IF NOT EXISTS public.nps_responses (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  program_key TEXT NOT NULL,
  user_email TEXT NOT NULL,
  user_id TEXT,
  score INT CHECK (score >= 0 AND score <= 10),
  comment TEXT,
  tags TEXT[] DEFAULT ARRAY[]::TEXT[],
  dismissed BOOLEAN DEFAULT false,
  dismissed_at TIMESTAMPTZ,
  responded_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Índices para performance
CREATE INDEX IF NOT EXISTS nps_programs_account_id_idx ON public.nps_programs(account_id);
CREATE INDEX IF NOT EXISTS nps_programs_key_idx ON public.nps_programs(program_key);
CREATE INDEX IF NOT EXISTS nps_responses_account_id_idx ON public.nps_responses(account_id);
CREATE INDEX IF NOT EXISTS nps_responses_program_key_idx ON public.nps_responses(program_key);
CREATE INDEX IF NOT EXISTS nps_responses_email_idx ON public.nps_responses(user_email);
CREATE INDEX IF NOT EXISTS nps_responses_created_at_idx ON public.nps_responses(created_at DESC);

-- RLS: nps_programs — somente o CSM dono da conta pode gerenciar
ALTER TABLE public.nps_programs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nps_programs_select" ON public.nps_programs
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = nps_programs.account_id
        AND accounts.csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "nps_programs_insert" ON public.nps_programs
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = nps_programs.account_id
        AND accounts.csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "nps_programs_update" ON public.nps_programs
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = nps_programs.account_id
        AND accounts.csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "nps_programs_delete" ON public.nps_programs
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = nps_programs.account_id
        AND accounts.csm_owner_id = auth.uid()
    )
  );

-- RLS: nps_responses — CSM dono pode ler; inserção é pública via service_role (embed)
ALTER TABLE public.nps_responses ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nps_responses_select" ON public.nps_responses
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = nps_responses.account_id
        AND accounts.csm_owner_id = auth.uid()
    )
  );

-- Inserção de respostas via service_role (endpoint público do embed) — sem RLS no insert
-- O service_role bypassa RLS, então nps_responses não precisa de policy de insert para anon/auth
