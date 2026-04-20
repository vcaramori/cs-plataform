-- Migration 008: NPS Questionnaire
-- Programa global (sem conta específica), builder de perguntas e respostas por questão

-- 1. Adiciona csm_owner_id em nps_programs (quem criou, mesmo quando global)
ALTER TABLE public.nps_programs
  ADD COLUMN IF NOT EXISTS csm_owner_id UUID REFERENCES auth.users(id);

-- 2. Torna account_id opcional (NULL = programa global, vale para todos os clientes do CSM)
ALTER TABLE public.nps_programs
  ALTER COLUMN account_id DROP NOT NULL;

-- 3. Tabela de perguntas do questionário
CREATE TABLE IF NOT EXISTS public.nps_questions (
  id           UUID    PRIMARY KEY DEFAULT gen_random_uuid(),
  program_id   UUID    NOT NULL REFERENCES public.nps_programs(id) ON DELETE CASCADE,
  order_index  INT     NOT NULL DEFAULT 0,
  type         TEXT    NOT NULL CHECK (type IN ('nps_scale', 'multiple_choice', 'text')),
  title        TEXT    NOT NULL,
  options      JSONB   DEFAULT NULL,    -- array de strings para multiple_choice
  required     BOOLEAN DEFAULT false,
  created_at   TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nps_questions_program_id_idx ON public.nps_questions(program_id);
CREATE INDEX IF NOT EXISTS nps_questions_order_idx     ON public.nps_questions(program_id, order_index);

-- 4. Tabela de respostas por pergunta
CREATE TABLE IF NOT EXISTS public.nps_answers (
  id               UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  response_id      UUID NOT NULL REFERENCES public.nps_responses(id) ON DELETE CASCADE,
  question_id      UUID NOT NULL REFERENCES public.nps_questions(id) ON DELETE CASCADE,
  text_value       TEXT,        -- para tipo 'text' e 'nps_scale' (score como string)
  selected_options TEXT[],      -- para tipo 'multiple_choice'
  created_at       TIMESTAMPTZ DEFAULT now()
);

CREATE INDEX IF NOT EXISTS nps_answers_response_id_idx ON public.nps_answers(response_id);
CREATE INDEX IF NOT EXISTS nps_answers_question_id_idx ON public.nps_answers(question_id);

-- 5. RLS: nps_questions — herdado pelo programa (CSM dono lê/edita)
ALTER TABLE public.nps_questions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nps_questions_select" ON public.nps_questions
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM public.nps_programs p
      WHERE p.id = nps_questions.program_id
        AND (
          p.csm_owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.accounts a
            WHERE a.id = p.account_id AND a.csm_owner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "nps_questions_insert" ON public.nps_questions
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.nps_programs p
      WHERE p.id = nps_questions.program_id
        AND (
          p.csm_owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.accounts a
            WHERE a.id = p.account_id AND a.csm_owner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "nps_questions_update" ON public.nps_questions
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.nps_programs p
      WHERE p.id = nps_questions.program_id
        AND (
          p.csm_owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.accounts a
            WHERE a.id = p.account_id AND a.csm_owner_id = auth.uid()
          )
        )
    )
  );

CREATE POLICY "nps_questions_delete" ON public.nps_questions
  FOR DELETE USING (
    EXISTS (
      SELECT 1 FROM public.nps_programs p
      WHERE p.id = nps_questions.program_id
        AND (
          p.csm_owner_id = auth.uid()
          OR EXISTS (
            SELECT 1 FROM public.accounts a
            WHERE a.id = p.account_id AND a.csm_owner_id = auth.uid()
          )
        )
    )
  );

-- 6. RLS: nps_answers — CSM dono lê; inserção pública via service_role
ALTER TABLE public.nps_answers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "nps_answers_select" ON public.nps_answers
  FOR SELECT USING (
    EXISTS (
      SELECT 1
        FROM public.nps_responses r
        JOIN public.nps_questions q ON q.id = nps_answers.question_id
        JOIN public.nps_programs  p ON p.id = q.program_id
       WHERE r.id = nps_answers.response_id
         AND (
           p.csm_owner_id = auth.uid()
           OR EXISTS (
             SELECT 1 FROM public.accounts a
             WHERE a.id = p.account_id AND a.csm_owner_id = auth.uid()
           )
         )
    )
  );

-- 7. Atualiza policies de nps_programs para suportar programas globais (csm_owner_id)
DROP POLICY IF EXISTS "nps_programs_select" ON public.nps_programs;
DROP POLICY IF EXISTS "nps_programs_insert" ON public.nps_programs;
DROP POLICY IF EXISTS "nps_programs_update" ON public.nps_programs;
DROP POLICY IF EXISTS "nps_programs_delete" ON public.nps_programs;

CREATE POLICY "nps_programs_select" ON public.nps_programs
  FOR SELECT USING (
    csm_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = nps_programs.account_id
        AND accounts.csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "nps_programs_insert" ON public.nps_programs
  FOR INSERT WITH CHECK (
    csm_owner_id = auth.uid()
  );

CREATE POLICY "nps_programs_update" ON public.nps_programs
  FOR UPDATE USING (
    csm_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = nps_programs.account_id
        AND accounts.csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "nps_programs_delete" ON public.nps_programs
  FOR DELETE USING (
    csm_owner_id = auth.uid()
    OR EXISTS (
      SELECT 1 FROM public.accounts
      WHERE accounts.id = nps_programs.account_id
        AND accounts.csm_owner_id = auth.uid()
    )
  );
