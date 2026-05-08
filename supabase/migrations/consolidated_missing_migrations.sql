

-- ==================================================
-- MIGRATION: 003_pgvector.sql
-- ==================================================

-- Sprint 3: pgvector
-- Tabela unificada de embeddings com busca por similaridade

CREATE EXTENSION IF NOT EXISTS vector;

-- ==============================================================================
-- EMBEDDINGS (chunks de interactions + support_tickets)
-- ==============================================================================
CREATE TABLE public.embeddings (
  id           UUID        PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id   UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  source_type  TEXT        NOT NULL CHECK (source_type IN ('interaction', 'support_ticket')),
  source_id    UUID        NOT NULL,
  chunk_index  INTEGER     NOT NULL DEFAULT 0,
  chunk_text   TEXT        NOT NULL,
  embedding    vector(768) NOT NULL,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX ON public.embeddings USING hnsw (embedding vector_cosine_ops);
CREATE INDEX idx_embeddings_account_id ON public.embeddings (account_id);
CREATE INDEX idx_embeddings_source     ON public.embeddings (source_type, source_id);

-- RLS
ALTER TABLE public.embeddings ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM vê próprios embeddings"
  ON public.embeddings FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "CSM insere próprios embeddings"
  ON public.embeddings FOR INSERT
  WITH CHECK (
    account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "CSM deleta próprios embeddings"
  ON public.embeddings FOR DELETE
  USING (
    account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  );

-- ==============================================================================
-- FUNÇÃO DE BUSCA POR SIMILARIDADE
-- Usada pelo RAG (/api/ask) e pelo Shadow Score (/api/health-scores/generate)
-- ==============================================================================
CREATE OR REPLACE FUNCTION search_embeddings(
  query_embedding   vector(768),
  match_account_id  UUID    DEFAULT NULL,
  match_source_type TEXT    DEFAULT NULL,
  match_limit       INTEGER DEFAULT 8,
  match_threshold   FLOAT   DEFAULT 0.5
)
RETURNS TABLE (
  id          UUID,
  account_id  UUID,
  source_type TEXT,
  source_id   UUID,
  chunk_index INTEGER,
  chunk_text  TEXT,
  similarity  FLOAT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.account_id,
    e.source_type,
    e.source_id,
    e.chunk_index,
    e.chunk_text,
    (1 - (e.embedding <=> query_embedding))::FLOAT AS similarity
  FROM public.embeddings e
  WHERE
    (match_account_id  IS NULL OR e.account_id  = match_account_id)
    AND (match_source_type IS NULL OR e.source_type = match_source_type)
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;


-- ==================================================
-- MIGRATION: 006_security_hardening.sql
-- ==================================================

-- ============================================================
-- MIGRAÇÃO 006 — Security Hardening
-- Resolve todos os alertas do Supabase Security Advisor:
--   ERROR : RLS desabilitado em public.clients
--   WARN  : search_path mutável nas functions
--   WARN  : políticas RLS sempre verdadeiras (USING/CHECK true)
-- ============================================================

-- ─────────────────────────────────────────────────────────────
-- 1. ERRO: habilitar RLS na tabela public.clients
-- ─────────────────────────────────────────────────────────────
ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;

-- Políticas para clients (leitura pública para authenticated, escrita restrita a usuários autenticados)
CREATE POLICY "clients_select_all"
  ON public.clients FOR SELECT TO authenticated
  USING (true);                              -- SELECT com true é intencional (acesso de leitura compartilhado)

CREATE POLICY "clients_insert_auth"
  ON public.clients FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clients_update_auth"
  ON public.clients FOR UPDATE TO authenticated
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "clients_delete_auth"
  ON public.clients FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);


-- ─────────────────────────────────────────────────────────────
-- 2. WARN: search_path mutável — recriar functions com SET search_path
-- ─────────────────────────────────────────────────────────────

-- 2a. log_contract_history (trigger function)
CREATE OR REPLACE FUNCTION public.log_contract_history()
  RETURNS trigger
  LANGUAGE plpgsql
  SET search_path = public          -- fix: search_path fixo
AS $$
BEGIN
  INSERT INTO contract_history (
    contract_id, account_id, mrr, arr, start_date, end_date, renewal_date,
    service_type, status, contracted_hours_monthly, csm_hour_cost,
    notes, contract_type, description
  ) VALUES (
    OLD.id, OLD.account_id, OLD.mrr, OLD.arr, OLD.start_date,
    COALESCE(NEW.start_date, CURRENT_DATE), OLD.renewal_date,
    OLD.service_type, OLD.status, OLD.contracted_hours_monthly, OLD.csm_hour_cost,
    OLD.notes, OLD.contract_type, OLD.description
  );
  RETURN NEW;
END;
$$;

-- 2b. search_embeddings
CREATE OR REPLACE FUNCTION public.search_embeddings(
  query_embedding      vector,
  match_account_id     uuid    DEFAULT NULL::uuid,
  match_source_type    text    DEFAULT NULL::text,
  match_limit          integer DEFAULT 10,
  match_threshold      double precision DEFAULT 0.5
)
  RETURNS TABLE(
    id          uuid,
    account_id  uuid,
    source_type text,
    source_id   uuid,
    chunk_index integer,
    chunk_text  text,
    similarity  double precision
  )
  LANGUAGE plpgsql
  SET search_path = public          -- fix: search_path fixo
AS $$
BEGIN
  RETURN QUERY
  SELECT
    e.id,
    e.account_id,
    e.source_type,
    e.source_id,
    e.chunk_index,
    e.chunk_text,
    (1 - (e.embedding <=> query_embedding))::float AS similarity
  FROM public.embeddings e
  WHERE
    (match_account_id  IS NULL OR e.account_id  = match_account_id)
    AND (match_source_type IS NULL OR e.source_type = match_source_type)
    AND (1 - (e.embedding <=> query_embedding)) > match_threshold
  ORDER BY e.embedding <=> query_embedding
  LIMIT match_limit;
END;
$$;


-- ─────────────────────────────────────────────────────────────
-- 3. WARN: políticas RLS com USING(true) / WITH CHECK(true)
--    Substitui "true" por "auth.uid() IS NOT NULL" em operações
--    de escrita (INSERT / UPDATE / DELETE).
--    SELECT com "true" é intencional (leitura compartilhada de equipe)
--    e está excluído do lint rule 0024.
-- ─────────────────────────────────────────────────────────────

-- 3a. accounts
DROP POLICY IF EXISTS "accounts_delete_all" ON public.accounts;
CREATE POLICY "accounts_delete_all"
  ON public.accounts FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "accounts_insert_all" ON public.accounts;
CREATE POLICY "accounts_insert_all"
  ON public.accounts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "accounts_update_all" ON public.accounts;
CREATE POLICY "accounts_update_all"
  ON public.accounts FOR UPDATE TO authenticated
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3b. adoption_metrics — policy "ALL" genérica → separar em comandos
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.adoption_metrics;
CREATE POLICY "adoption_metrics_select"
  ON public.adoption_metrics FOR SELECT TO authenticated
  USING (true);                              -- SELECT intencional

CREATE POLICY "adoption_metrics_insert"
  ON public.adoption_metrics FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "adoption_metrics_update"
  ON public.adoption_metrics FOR UPDATE TO authenticated
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "adoption_metrics_delete"
  ON public.adoption_metrics FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 3c. contacts — apenas INSERT estava com true
DROP POLICY IF EXISTS "contacts_insert_all" ON public.contacts;
CREATE POLICY "contacts_insert_all"
  ON public.contacts FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3d. interactions
DROP POLICY IF EXISTS "interactions_delete_all" ON public.interactions;
CREATE POLICY "interactions_delete_all"
  ON public.interactions FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

DROP POLICY IF EXISTS "interactions_insert_all" ON public.interactions;
CREATE POLICY "interactions_insert_all"
  ON public.interactions FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3e. success_goals — policy "ALL" genérica → separar
DROP POLICY IF EXISTS "Allow all for authenticated users" ON public.success_goals;
CREATE POLICY "success_goals_select"
  ON public.success_goals FOR SELECT TO authenticated
  USING (true);

CREATE POLICY "success_goals_insert"
  ON public.success_goals FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "success_goals_update"
  ON public.success_goals FOR UPDATE TO authenticated
  USING  (auth.uid() IS NOT NULL)
  WITH CHECK (auth.uid() IS NOT NULL);

CREATE POLICY "success_goals_delete"
  ON public.success_goals FOR DELETE TO authenticated
  USING (auth.uid() IS NOT NULL);

-- 3f. support_tickets — INSERT
DROP POLICY IF EXISTS "support_tickets_insert_all" ON public.support_tickets;
CREATE POLICY "support_tickets_insert_all"
  ON public.support_tickets FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);

-- 3g. time_entries — INSERT
DROP POLICY IF EXISTS "time_entries_insert_all" ON public.time_entries;
CREATE POLICY "time_entries_insert_all"
  ON public.time_entries FOR INSERT TO authenticated
  WITH CHECK (auth.uid() IS NOT NULL);


-- ==================================================
-- MIGRATION: 008_nps_questionnaire.sql
-- ==================================================

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


-- ==================================================
-- MIGRATION: 009_nps_improvements.sql
-- ==================================================

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


-- ==================================================
-- MIGRATION: 011_nps_goals_and_targets.sql
-- ==================================================

-- Migration 011: NPS Goals and Program Targets
-- Implement metas vivas e históricas para NPS

-- 1. Tabela de Metas Globais (Histórico)
CREATE TABLE IF NOT EXISTS public.nps_global_goals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    goal_score INT NOT NULL,
    start_date TIMESTAMPTZ NOT NULL DEFAULT now(),
    end_date TIMESTAMPTZ, -- nulo se for a meta atual
    created_at TIMESTAMPTZ DEFAULT now()
);

-- 2. Adiciona campo de meta opcional nos programas
ALTER TABLE public.nps_programs ADD COLUMN IF NOT EXISTS target_score INT;

-- 3. Habilita RLS para nps_global_goals
ALTER TABLE public.nps_global_goals ENABLE ROW LEVEL SECURITY;

-- 4. Políticas de RLS para metas (leitura por todos os CSMs, escrita por administradores ou qualquer CSM autenticado neste contexto simplificado)
CREATE POLICY "nps_global_goals_select" ON public.nps_global_goals
    FOR SELECT USING (auth.role() = 'authenticated');

CREATE POLICY "nps_global_goals_insert" ON public.nps_global_goals
    FOR INSERT WITH CHECK (auth.role() = 'authenticated');

CREATE POLICY "nps_global_goals_update" ON public.nps_global_goals
    FOR UPDATE USING (auth.role() = 'authenticated');

-- 5. Função para fechar meta anterior ao inserir uma nova (Trigger simplificado ou execução manual no backend)
-- No backend, sempre que inserirmos uma nova meta global, faremos o update da anterior setando end_date = now().


-- ==================================================
-- MIGRATION: 014_support_messaging_refactor.sql
-- ==================================================

-- Migration 014: Support Messaging Refactor
-- Adds support_ticket_messages for a real message thread and internal notes.
-- Hardens support_tickets for contract-centric SLA.

-- 1. Ensure support_tickets has requester_email and indexes
ALTER TABLE public.support_tickets 
    ADD COLUMN IF NOT EXISTS requester_email TEXT;

CREATE INDEX IF NOT EXISTS idx_support_tickets_contract ON public.support_tickets(contract_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_requester ON public.support_tickets(requester_email);

-- 2. Create support_ticket_messages table
CREATE TABLE public.support_ticket_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    author_id UUID REFERENCES auth.users(id) ON DELETE SET NULL, -- Null if sent by client
    author_email TEXT NOT NULL,
    type TEXT NOT NULL CHECK (type IN ('reply', 'note', 'status_change', 'auto_event')),
    body TEXT NOT NULL,
    metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. RLS for messages
ALTER TABLE public.support_ticket_messages ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view messages for their tickets" ON public.support_ticket_messages
    FOR SELECT USING (ticket_id IN (
        SELECT st.id FROM public.support_tickets st
        JOIN public.accounts a ON a.id = st.account_id
        WHERE a.csm_owner_id = auth.uid()
    ));

CREATE POLICY "CSM can insert messages" ON public.support_ticket_messages
    FOR INSERT WITH CHECK (ticket_id IN (
        SELECT st.id FROM public.support_tickets st
        JOIN public.accounts a ON a.id = st.account_id
        WHERE a.csm_owner_id = auth.uid()
    ));

-- 4. Initial Migration of existing thread_content (Optional but recommended)
-- This moves account description + thread_content into the new messages table
-- Note: We only do this if you want to keep history. 
-- Since we are starting now, we will do it via a script or manual process to avoid migration timeouts.

-- 5. Indexes for messages
CREATE INDEX idx_support_messages_ticket ON public.support_ticket_messages(ticket_id, created_at ASC);
CREATE INDEX idx_support_messages_type ON public.support_ticket_messages(type);


-- ==================================================
-- MIGRATION: 015_support_automation_v2.sql
-- ==================================================

-- Migration 015: Support Automation v2
-- Adds pending reason to tickets and scheduling for follow-ups.

-- 1. Add pending_reason to support_tickets
ALTER TABLE public.support_tickets 
    ADD COLUMN IF NOT EXISTS pending_reason TEXT DEFAULT 'none' 
    CHECK (pending_reason IN ('none', 'client', 'product'));

-- 2. Create support_schedules table
CREATE TABLE IF NOT EXISTS public.support_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    target_time TIMESTAMPTZ NOT NULL,
    reason TEXT,
    completed BOOLEAN NOT NULL DEFAULT false,
    notified BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- 3. RLS for schedules
ALTER TABLE public.support_schedules ENABLE ROW LEVEL SECURITY;

-- Check if policy exists before creating (to avoid error)
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'CSM can view and manage schedules for their tickets') THEN
        CREATE POLICY "CSM can view and manage schedules for their tickets" ON public.support_schedules
            FOR ALL USING (ticket_id IN (
                SELECT st.id FROM public.support_tickets st
                JOIN public.accounts a ON a.id = st.account_id
                WHERE a.csm_owner_id = auth.uid()
            ));
    END IF;
END $$;

-- 4. Indexes
CREATE INDEX IF NOT EXISTS idx_support_schedules_target ON public.support_schedules(target_time) WHERE NOT completed;
CREATE INDEX IF NOT EXISTS idx_support_schedules_ticket ON public.support_schedules(ticket_id);


-- ==================================================
-- MIGRATION: 018_predictive_risk.sql
-- ==================================================

-- 018_predictive_risk.sql
-- Epic 10: IA Preditiva de Risco e Churn

CREATE TABLE account_risk_assessments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    account_id UUID NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
    risk_score INTEGER NOT NULL CHECK (risk_score >= 0 AND risk_score <= 100),
    sentiment_label TEXT NOT NULL CHECK (sentiment_label IN ('positive', 'neutral', 'negative', 'at-risk')),
    ai_reasoning TEXT NOT NULL,
    analyzed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Index for querying recent assessments by account
CREATE INDEX idx_account_risk_assessments_account_id_analyzed_at ON account_risk_assessments(account_id, analyzed_at DESC);

-- RLS
ALTER TABLE account_risk_assessments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Risk assessments are visible to users of the same company" ON account_risk_assessments
  FOR SELECT USING (
    EXISTS (
      SELECT 1 FROM accounts
      WHERE accounts.id = account_risk_assessments.account_id
      AND accounts.company_id = (SELECT company_id FROM users WHERE users.id = auth.uid())
    )
  );

CREATE POLICY "Risk assessments can be inserted by authenticated users (webhooks)" ON account_risk_assessments
  FOR INSERT WITH CHECK (
    auth.role() = 'authenticated' OR auth.role() = 'service_role'
  );


-- ==================================================
-- MIGRATION: 020_f2_03_account_filters.sql
-- ==================================================

-- F2-03: Dynamic Segmentation for Accounts
-- Create indexes to improve filter performance on account queries

-- Index on health_status for health-based filtering
CREATE INDEX IF NOT EXISTS idx_accounts_health_status
ON accounts(health_status)
WHERE deleted_at IS NULL;

-- Index on segment for segment-based filtering
CREATE INDEX IF NOT EXISTS idx_accounts_segment
ON accounts(segment)
WHERE deleted_at IS NULL;

-- Index on csm_owner_id for CSM-based filtering (RLS)
CREATE INDEX IF NOT EXISTS idx_accounts_csm_owner_id
ON accounts(csm_owner_id)
WHERE deleted_at IS NULL;

-- Composite index for common filter combinations
CREATE INDEX IF NOT EXISTS idx_accounts_health_segment
ON accounts(health_status, segment)
WHERE deleted_at IS NULL;

-- Composite index for CSM + health status (common in dashboards)
CREATE INDEX IF NOT EXISTS idx_accounts_csm_health
ON accounts(csm_owner_id, health_status)
WHERE deleted_at IS NULL;

-- Index on contracts table for MRR-based filtering
CREATE INDEX IF NOT EXISTS idx_contracts_mrr
ON contracts(mrr)
WHERE deleted_at IS NULL;

-- Index on contract status for status filtering
CREATE INDEX IF NOT EXISTS idx_contracts_status
ON contracts(status)
WHERE deleted_at IS NULL;

-- Composite index on contracts for common filter combinations
CREATE INDEX IF NOT EXISTS idx_contracts_account_status
ON contracts(account_id, status)
WHERE deleted_at IS NULL;


-- ==================================================
-- MIGRATION: 030_f3_02_proactive_alerts.sql
-- ==================================================

-- F3-02: Proactive Alerts Engine
-- Creates alert types, severity levels, and alert tracking tables with RLS

-- Create enum types
CREATE TYPE alert_type AS ENUM (
  'churn_risk',
  'silent_customer',
  'renewal_upcoming',
  'adoption_anomaly',
  'expansion_signal',
  'nps_detractor_unactioned'
);

CREATE TYPE alert_severity AS ENUM ('critical', 'warning', 'info');

-- Create proactive_alerts table
CREATE TABLE proactive_alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  type alert_type NOT NULL,
  severity alert_severity NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}',
  resolved_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Constraint único: 1 alerta por (account_id, type) por dia (não resolvidos)
CREATE UNIQUE INDEX proactive_alerts_daily_uniq
  ON proactive_alerts(account_id, type, DATE(created_at))
  WHERE resolved_at IS NULL;

-- Índices para queries rápidas
CREATE INDEX idx_proactive_alerts_account_id ON proactive_alerts(account_id);
CREATE INDEX idx_proactive_alerts_severity ON proactive_alerts(severity);
CREATE INDEX idx_proactive_alerts_created_at ON proactive_alerts(created_at DESC);
CREATE INDEX idx_proactive_alerts_type ON proactive_alerts(type);
CREATE INDEX idx_proactive_alerts_resolved ON proactive_alerts(resolved_at);

-- Enable RLS
ALTER TABLE proactive_alerts ENABLE ROW LEVEL SECURITY;

-- RLS Policies
CREATE POLICY "CSM sees own account alerts"
  ON proactive_alerts FOR SELECT
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE csm_owner_id = auth.uid()
    )
  );

CREATE POLICY "CSM updates own account alerts"
  ON proactive_alerts FOR UPDATE
  USING (
    account_id IN (
      SELECT id FROM accounts WHERE csm_owner_id = auth.uid()
    )
  );

-- Grant permissions
GRANT ALL ON proactive_alerts TO authenticated;
GRANT SELECT, UPDATE ON proactive_alerts TO authenticated;


-- ==================================================
-- MIGRATION: 031_f3_03_success_plans.sql
-- ==================================================

-- F3-03: Success Plans MVP
-- Creates success plan templates with shared tokens for public viewing

-- Table: success_plans
CREATE TABLE success_plans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES accounts(id) ON DELETE CASCADE,
  title text NOT NULL,
  shared_token uuid NOT NULL UNIQUE DEFAULT gen_random_uuid(),
  created_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Table: success_plan_goals
CREATE TABLE success_plan_goals (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  plan_id uuid NOT NULL REFERENCES success_plans(id) ON DELETE CASCADE,
  title text NOT NULL,
  description text,
  target_date date,
  status text NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'ongoing', 'completed', 'delayed')),
  completed_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  deleted_at timestamptz
);

-- Indexes for performance
CREATE INDEX idx_success_plans_account_id ON success_plans(account_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plans_shared_token ON success_plans(shared_token) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plans_created_by ON success_plans(created_by) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plan_goals_plan_id ON success_plan_goals(plan_id) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plan_goals_status ON success_plan_goals(status) WHERE deleted_at IS NULL;
CREATE INDEX idx_success_plan_goals_target_date ON success_plan_goals(target_date) WHERE deleted_at IS NULL;

-- Enable RLS
ALTER TABLE success_plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE success_plan_goals ENABLE ROW LEVEL SECURITY;

-- RLS Policies for success_plans
CREATE POLICY "CSM sees own account plans"
  ON success_plans FOR SELECT
  USING (
    account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "CSM creates own account plans"
  ON success_plans FOR INSERT
  WITH CHECK (
    account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "CSM manages own account plans"
  ON success_plans FOR UPDATE
  USING (
    account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
  );

-- RLS Policies for success_plan_goals
CREATE POLICY "CSM manages plan goals"
  ON success_plan_goals FOR ALL
  USING (
    plan_id IN (
      SELECT id FROM success_plans
      WHERE account_id IN (SELECT id FROM accounts WHERE csm_owner_id = auth.uid())
    )
  );

-- Grant permissions
GRANT ALL ON success_plans TO authenticated;
GRANT ALL ON success_plan_goals TO authenticated;


-- ==================================================
-- MIGRATION: 20260505161000_f1_15_auto_assign.sql
-- ==================================================

-- Migration: F1-15 Auto-assign Tickets
-- Date: 2026-05-05
-- Objective: Enable automatic ticket assignment based on CSM queue capacity

-- Note: Tables created in 20260505160000_f1_14_queue_capacity.sql
-- This migration ensures auto_assign_enabled flag is present and adds telemetry table

-- ==============================================================================
-- 1. Create auto_assign_stats table for telemetry
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.auto_assign_stats (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  assigned_ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  assigned_to_csm_id uuid NOT NULL REFERENCES public.auth.users(id) ON DELETE RESTRICT,
  previous_assigned_to uuid,
  assigned_at timestamptz DEFAULT now(),
  capacity_before int NOT NULL,
  capacity_after int NOT NULL,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auto_assign_stats_ticket
ON public.auto_assign_stats(assigned_ticket_id);

CREATE INDEX IF NOT EXISTS idx_auto_assign_stats_csm
ON public.auto_assign_stats(assigned_to_csm_id);

CREATE INDEX IF NOT EXISTS idx_auto_assign_stats_created_at
ON public.auto_assign_stats(created_at DESC);

-- ==============================================================================
-- 2. Enable RLS on auto_assign_stats
-- ==============================================================================

ALTER TABLE public.auto_assign_stats ENABLE ROW LEVEL SECURITY;

-- CSMs can view auto-assignment stats for their own tickets
CREATE POLICY "CSM can view auto-assign stats for their tickets" ON public.auto_assign_stats
FOR SELECT TO authenticated
USING (
  assigned_ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "Service role can do everything on auto_assign_stats" ON public.auto_assign_stats
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 3. Create hourly aggregation view for dashboard telemetry
-- ==============================================================================

CREATE OR REPLACE VIEW public.auto_assign_metrics AS
SELECT
  DATE_TRUNC('hour', created_at) as hour,
  COUNT(*) as total_auto_assigned,
  COUNT(DISTINCT assigned_to_csm_id) as csms_involved,
  AVG(capacity_before)::int as avg_capacity_before,
  AVG(capacity_after)::int as avg_capacity_after
FROM public.auto_assign_stats
WHERE created_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('hour', created_at)
ORDER BY hour DESC;

-- ==============================================================================
-- 4. Ensure auto_assign_enabled flag exists in csm_settings
-- ==============================================================================

-- Already added in F1-14 migration (20260505160000)
-- This is a safeguard in case migrations run out of order

ALTER TABLE public.csm_settings
ADD COLUMN IF NOT EXISTS auto_assign_enabled boolean DEFAULT true;


-- ==================================================
-- MIGRATION: 20260505162000_f1_16_sla_escalation.sql
-- ==================================================

-- Migration: F1-16 SLA Escalation
-- Date: 2026-05-05
-- Objective: Track SLA violations and escalations to Slack

-- ==============================================================================
-- 1. Create sla_escalations table for tracking escalations
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sla_escalations (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  escalated_at timestamptz DEFAULT now(),
  sla_status text NOT NULL CHECK (sla_status IN ('atencao', 'vencido')),
  escalation_count int DEFAULT 1,
  last_escalated_at timestamptz DEFAULT now(),
  slack_message_ts text,
  slack_channel text,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_escalations_ticket
ON public.sla_escalations(ticket_id);

CREATE INDEX IF NOT EXISTS idx_sla_escalations_escalated_at
ON public.sla_escalations(escalated_at DESC);

CREATE INDEX IF NOT EXISTS idx_sla_escalations_sla_status
ON public.sla_escalations(sla_status);

-- ==============================================================================
-- 2. Enable RLS on sla_escalations
-- ==============================================================================

ALTER TABLE public.sla_escalations ENABLE ROW LEVEL SECURITY;

-- CSMs can view escalations for their tickets
CREATE POLICY "CSM can view escalations for their tickets" ON public.sla_escalations
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
  )
);

-- Service role can do everything
CREATE POLICY "Service role can do everything on sla_escalations" ON public.sla_escalations
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 3. Create sla_escalation_metrics table for telemetry/dashboard
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.sla_escalation_metrics (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  escalation_date date DEFAULT CURRENT_DATE,
  sla_status text NOT NULL CHECK (sla_status IN ('atencao', 'vencido')),
  escalation_count int DEFAULT 1,
  total_escalations int DEFAULT 1,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_sla_escalation_metrics_date
ON public.sla_escalation_metrics(escalation_date DESC);

CREATE INDEX IF NOT EXISTS idx_sla_escalation_metrics_status
ON public.sla_escalation_metrics(sla_status);

-- ==============================================================================
-- 4. Create aggregated escalation view for dashboard
-- ==============================================================================

CREATE OR REPLACE VIEW public.sla_escalation_summary AS
SELECT
  DATE_TRUNC('day', escalated_at)::date as escalation_date,
  sla_status,
  COUNT(*) as total_escalations,
  COUNT(DISTINCT ticket_id) as unique_tickets,
  COUNT(DISTINCT (
    SELECT assigned_to FROM public.support_tickets WHERE id = sla_escalations.ticket_id
  )) as affected_csms
FROM public.sla_escalations
WHERE escalated_at >= NOW() - INTERVAL '30 days'
GROUP BY DATE_TRUNC('day', escalated_at), sla_status
ORDER BY escalation_date DESC, sla_status;

-- ==============================================================================
-- 5. Add slack_webhook_sla_alerts env var note (configured at app level)
-- ==============================================================================

-- Note: SLACK_WEBHOOK_SLA_ALERTS environment variable should be set at deployment
-- Format: https://hooks.slack.com/services/T.../B.../XXXX
-- If not set, escalations are logged but not sent to Slack (graceful degradation)

-- ==============================================================================
-- 6. Create function to get SLA critical tickets (for escalation query)
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_sla_critical_tickets()
RETURNS TABLE (
  ticket_id uuid,
  ticket_title text,
  account_name text,
  assigned_csm_id uuid,
  assigned_csm_name text,
  priority text,
  sla_status text,
  hours_elapsed numeric,
  deadline_at timestamptz
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.title,
    a.name,
    st.assigned_to,
    u.full_name,
    st.priority,
    CASE
      WHEN se.sla_status_resolution = 'vencido' THEN 'vencido'
      WHEN se.sla_status_resolution = 'atencao' THEN 'atencao'
      ELSE 'no_prazo'
    END,
    EXTRACT(EPOCH FROM (NOW() - st.created_at)) / 3600.0,
    se.deadline_resolution
  FROM public.support_tickets st
  LEFT JOIN public.sla_events se ON se.ticket_id = st.id
  LEFT JOIN public.accounts a ON a.id = st.account_id
  LEFT JOIN public.auth.users u ON u.id = st.assigned_to
  WHERE st.status != 'closed'
    AND (se.sla_status_resolution IN ('atencao', 'vencido'))
  ORDER BY se.deadline_resolution ASC;
END;
$$ LANGUAGE plpgsql;

-- Grant execution to authenticated users and service role
GRANT EXECUTE ON FUNCTION get_sla_critical_tickets() TO authenticated, service_role;


-- ==================================================
-- MIGRATION: 20260505163000_f1_18_auto_categorize.sql
-- ==================================================

-- Migration: F1-18 Auto-Categorization
-- Date: 2026-05-05
-- Objective: Add auto-categorization columns and tables

-- ==============================================================================
-- 1. Add columns to support_tickets for categorization suggestions
-- ==============================================================================

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS suggested_category text,
ADD COLUMN IF NOT EXISTS suggestion_confidence float DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS suggestion_reasoning text;

-- Add comments for clarity
COMMENT ON COLUMN public.support_tickets.suggested_category IS 'AI-suggested category: Bug, Feature Request, Account/Billing, Performance, Other';
COMMENT ON COLUMN public.support_tickets.suggestion_confidence IS 'Confidence score 0.0-1.0 for suggested category';
COMMENT ON COLUMN public.support_tickets.suggestion_reasoning IS 'Reasoning from IA for suggestion';

-- ==============================================================================
-- 2. Create categorization_suggestions table for audit/history
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.categorization_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  suggested_category text NOT NULL,
  confidence float NOT NULL CHECK (confidence >= 0.0 AND confidence <= 1.0),
  reasoning text,
  status text DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'rejected')),
  auto_applied boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  applied_at timestamptz,
  applied_by uuid REFERENCES auth.users(id)
);

CREATE INDEX IF NOT EXISTS idx_categorization_suggestions_ticket
ON public.categorization_suggestions(ticket_id);

CREATE INDEX IF NOT EXISTS idx_categorization_suggestions_status
ON public.categorization_suggestions(status);

CREATE INDEX IF NOT EXISTS idx_categorization_suggestions_created
ON public.categorization_suggestions(created_at DESC);

-- ==============================================================================
-- 3. Enable RLS on categorization_suggestions
-- ==============================================================================

ALTER TABLE public.categorization_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view suggestions for their tickets" ON public.categorization_suggestions
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
    OR account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can do everything on categorization_suggestions" ON public.categorization_suggestions
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. Create function to get categorization candidates (future extension)
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_pending_categorization_suggestions()
RETURNS TABLE (
  ticket_id uuid,
  ticket_title text,
  suggested_category text,
  confidence float,
  reasoning text,
  account_name text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    cs.ticket_id,
    st.title,
    cs.suggested_category,
    cs.confidence,
    cs.reasoning,
    a.name
  FROM public.categorization_suggestions cs
  JOIN public.support_tickets st ON st.id = cs.ticket_id
  JOIN public.accounts a ON a.id = st.account_id
  WHERE cs.status = 'pending'
    AND cs.confidence < 0.75
  ORDER BY cs.created_at DESC;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_pending_categorization_suggestions() TO authenticated, service_role;

-- ==============================================================================
-- 5. Add index for faster lookups by account and status
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_categorization_suggestions_ticket_status
ON public.categorization_suggestions(ticket_id, status);


-- ==================================================
-- MIGRATION: 20260505164000_f1_17_rag_reply_suggestion.sql
-- ==================================================

-- Migration: F1-17 RAG Reply Suggestion
-- Date: 2026-05-05
-- Objective: Add reply suggestion tables and tracking

-- ==============================================================================
-- 1. Create reply_suggestions table for tracking suggestions
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reply_suggestions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  suggestion_text text NOT NULL,
  confidence float DEFAULT 0.0 CHECK (confidence >= 0.0 AND confidence <= 1.0),
  sources text[], -- JSON array of referenced ticket IDs
  model_used text DEFAULT 'gemini-2.5-flash',
  generated_at timestamptz DEFAULT now(),
  accepted_at timestamptz,
  accepted_by uuid REFERENCES auth.users(id),
  rejected_at timestamptz,
  rejected_by uuid REFERENCES auth.users(id),
  used_in_reply boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_suggestions_ticket
ON public.reply_suggestions(ticket_id);

CREATE INDEX IF NOT EXISTS idx_reply_suggestions_created
ON public.reply_suggestions(created_at DESC);

CREATE INDEX IF NOT EXISTS idx_reply_suggestions_ticket_created
ON public.reply_suggestions(ticket_id, created_at DESC);

-- ==============================================================================
-- 2. Enable RLS on reply_suggestions
-- ==============================================================================

ALTER TABLE public.reply_suggestions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view suggestions for their tickets" ON public.reply_suggestions
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
    OR account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can do everything on reply_suggestions" ON public.reply_suggestions
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 3. Create reply_suggestion_cache for 5-min caching
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reply_suggestion_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL REFERENCES public.reply_suggestions(id) ON DELETE CASCADE,
  cached_at timestamptz DEFAULT now(),
  expires_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_reply_suggestion_cache_ticket
ON public.reply_suggestion_cache(ticket_id);

CREATE INDEX IF NOT EXISTS idx_reply_suggestion_cache_expires
ON public.reply_suggestion_cache(expires_at);

-- ==============================================================================
-- 4. Create reply_suggestion_telemetry for analytics
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reply_suggestion_telemetry (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  suggestion_id uuid NOT NULL REFERENCES public.reply_suggestions(id) ON DELETE CASCADE,
  action text NOT NULL CHECK (action IN ('accepted', 'rejected', 'edited')),
  action_at timestamptz DEFAULT now(),
  edit_distance int, -- Levenshtein distance if edited
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_suggestion_telemetry_action
ON public.reply_suggestion_telemetry(action);

CREATE INDEX IF NOT EXISTS idx_reply_suggestion_telemetry_created
ON public.reply_suggestion_telemetry(created_at DESC);

-- ==============================================================================
-- 5. Function to get similar tickets for RAG context
-- ==============================================================================

CREATE OR REPLACE FUNCTION get_similar_tickets_for_rag(
  p_ticket_id uuid,
  p_limit int DEFAULT 5,
  p_threshold float DEFAULT 0.75
)
RETURNS TABLE (
  similar_ticket_id uuid,
  similar_ticket_title text,
  similarity_score float,
  latest_reply text,
  last_reply_at timestamptz,
  category text
) AS $$
BEGIN
  RETURN QUERY
  SELECT
    st.id,
    st.title,
    (e1.embedding <-> e2.embedding) as similarity, -- cosine distance
    (
      SELECT sle.metadata->>'body'
      FROM public.ticket_events sle
      WHERE sle.ticket_id = st.id
        AND sle.event_type IN ('reply', 'note')
      ORDER BY sle.occurred_at DESC
      LIMIT 1
    ) as latest_reply,
    (
      SELECT sle.occurred_at
      FROM public.ticket_events sle
      WHERE sle.ticket_id = st.id
        AND sle.event_type IN ('reply', 'note')
      ORDER BY sle.occurred_at DESC
      LIMIT 1
    ) as last_reply_at,
    st.category
  FROM public.support_tickets st
  JOIN public.embeddings e1 ON e1.resource_id = p_ticket_id AND e1.resource_type = 'support_ticket'
  JOIN public.embeddings e2 ON e2.resource_id = st.id AND e2.resource_type = 'support_ticket'
  WHERE st.id != p_ticket_id
    AND st.status IN ('resolved', 'closed')
    AND (e1.embedding <-> e2.embedding) <= (1 - p_threshold) -- similarity >= threshold
  ORDER BY (e1.embedding <-> e2.embedding) ASC
  LIMIT p_limit;
END;
$$ LANGUAGE plpgsql;

GRANT EXECUTE ON FUNCTION get_similar_tickets_for_rag(uuid, int, float) TO authenticated, service_role;

-- ==============================================================================
-- 6. Function to invalidate reply suggestion cache on new reply
-- ==============================================================================

CREATE OR REPLACE FUNCTION invalidate_reply_suggestion_cache()
RETURNS TRIGGER AS $$
BEGIN
  DELETE FROM public.reply_suggestion_cache
  WHERE ticket_id = NEW.ticket_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Trigger on ticket_events to invalidate cache when new reply arrives
-- Note: This will be created after ticket_events structure is verified
-- CREATE TRIGGER invalidate_reply_cache_on_new_reply
-- AFTER INSERT ON public.ticket_events
-- FOR EACH ROW
-- WHEN (NEW.event_type IN ('reply', 'note'))
-- EXECUTE FUNCTION invalidate_reply_suggestion_cache();


-- ==================================================
-- MIGRATION: 20260505165000_f1_19_ticket_summary.sql
-- ==================================================

-- Migration: F1-19 Ticket Summary
-- Date: 2026-05-05
-- Objective: Add ticket summary generation and caching

-- ==============================================================================
-- 1. Add columns to support_tickets for summary caching
-- ==============================================================================

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS summary text,
ADD COLUMN IF NOT EXISTS summary_generated_at timestamptz;

COMMENT ON COLUMN public.support_tickets.summary IS 'AI-generated 1-2 sentence summary (max 150 chars)';
COMMENT ON COLUMN public.support_tickets.summary_generated_at IS 'Timestamp when summary was last generated (cache validation)';

-- ==============================================================================
-- 2. Create ticket_summary_cache table for invalidation tracking
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_summary_cache (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL UNIQUE REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  generated_at timestamptz DEFAULT now(),
  expires_at timestamptz,
  stale boolean DEFAULT false,
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_cache_ticket
ON public.ticket_summary_cache(ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_cache_stale
ON public.ticket_summary_cache(stale);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_cache_expires
ON public.ticket_summary_cache(expires_at);

-- ==============================================================================
-- 3. Enable RLS on ticket_summary_cache
-- ==============================================================================

ALTER TABLE public.ticket_summary_cache ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view summary cache for their tickets" ON public.ticket_summary_cache
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
    OR account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can do everything on ticket_summary_cache" ON public.ticket_summary_cache
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. Create ticket_summary_history table for audit trail
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.ticket_summary_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  summary_text text NOT NULL,
  generated_by text DEFAULT 'ai', -- 'ai' or 'manual'
  regenerated_at timestamptz DEFAULT now(),
  regenerated_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_history_ticket
ON public.ticket_summary_history(ticket_id);

CREATE INDEX IF NOT EXISTS idx_ticket_summary_history_regenerated
ON public.ticket_summary_history(regenerated_at DESC);

-- ==============================================================================
-- 5. Function to mark summary as stale (called when new reply arrives)
-- ==============================================================================

CREATE OR REPLACE FUNCTION mark_summary_as_stale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE public.ticket_summary_cache
  SET stale = true
  WHERE ticket_id = NEW.ticket_id;

  UPDATE public.support_tickets
  SET summary = NULL,
      summary_generated_at = NULL
  WHERE id = NEW.ticket_id;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Note: Trigger will be created after ticket_events structure is verified
-- CREATE TRIGGER mark_summary_stale_on_new_reply
-- AFTER INSERT ON public.ticket_events
-- FOR EACH ROW
-- WHEN (NEW.event_type IN ('reply'))
-- EXECUTE FUNCTION mark_summary_as_stale();

-- ==============================================================================
-- 6. View for stale summaries needing regeneration
-- ==============================================================================

CREATE OR REPLACE VIEW public.stale_ticket_summaries AS
SELECT
  st.id,
  st.title,
  st.status,
  st.assigned_to,
  tsc.summary_text,
  tsc.generated_at,
  EXTRACT(HOUR FROM (NOW() - tsc.generated_at))::int as hours_since_generation
FROM public.support_tickets st
LEFT JOIN public.ticket_summary_cache tsc ON st.id = tsc.ticket_id
WHERE st.status IN ('open', 'in_progress')
  AND (st.summary_generated_at IS NULL OR NOW() - st.summary_generated_at > INTERVAL '24 hours' OR tsc.stale = true)
ORDER BY st.opened_at DESC;

-- ==============================================================================
-- 7. Grant permissions
-- ==============================================================================

GRANT SELECT ON public.stale_ticket_summaries TO authenticated, service_role;


-- ==================================================
-- MIGRATION: 20260505166000_f1_20_sentiment_trend.sql
-- ==================================================

-- Migration: F1-20 Sentiment Trend Analysis
-- Date: 2026-05-05
-- Objective: Add sentiment analysis for ticket replies with trend tracking

-- ==============================================================================
-- 1. Create reply_sentiments table for storing analyzed sentiments
-- ==============================================================================

CREATE TABLE IF NOT EXISTS public.reply_sentiments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  reply_id uuid NOT NULL UNIQUE REFERENCES public.support_ticket_messages(id) ON DELETE CASCADE,
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  sentiment text NOT NULL CHECK (sentiment IN ('positive', 'neutral', 'negative')),
  score numeric(3, 2) NOT NULL CHECK (score >= 0 AND score <= 1),
  keywords text[] DEFAULT '{}',
  analyzed_at timestamptz DEFAULT now(),
  confidence numeric(3, 2) NOT NULL DEFAULT 1 CHECK (confidence >= 0 AND confidence <= 1),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_reply_sentiments_reply
ON public.reply_sentiments(reply_id);

CREATE INDEX IF NOT EXISTS idx_reply_sentiments_ticket
ON public.reply_sentiments(ticket_id);

CREATE INDEX IF NOT EXISTS idx_reply_sentiments_analyzed
ON public.reply_sentiments(analyzed_at DESC);

CREATE INDEX IF NOT EXISTS idx_reply_sentiments_sentiment
ON public.reply_sentiments(sentiment);

COMMENT ON TABLE public.reply_sentiments IS 'Sentiment analysis results for ticket replies (positive/neutral/negative)';
COMMENT ON COLUMN public.reply_sentiments.reply_id IS 'Reference to support_ticket_messages.id';
COMMENT ON COLUMN public.reply_sentiments.ticket_id IS 'Denormalized ticket_id for query efficiency';
COMMENT ON COLUMN public.reply_sentiments.sentiment IS 'Sentiment classification: positive, neutral, or negative';
COMMENT ON COLUMN public.reply_sentiments.score IS 'Sentiment score from 0 to 1 (0=extremely negative, 0.5=neutral, 1=extremely positive)';
COMMENT ON COLUMN public.reply_sentiments.keywords IS 'Array of keywords indicating sentiment (e.g. "satisfeito", "resolvido")';
COMMENT ON COLUMN public.reply_sentiments.analyzed_at IS 'Timestamp when sentiment was analyzed';
COMMENT ON COLUMN public.reply_sentiments.confidence IS 'Confidence score from Gemini (0=low, 1=high confidence)';

-- ==============================================================================
-- 2. Add sentiment_trend_cache column to support_tickets
-- ==============================================================================

ALTER TABLE public.support_tickets
ADD COLUMN IF NOT EXISTS sentiment_trend_cache jsonb DEFAULT NULL,
ADD COLUMN IF NOT EXISTS sentiment_trend_cache_generated_at timestamptz;

COMMENT ON COLUMN public.support_tickets.sentiment_trend_cache IS 'JSON array of last 10 sentiment scores for sparkline rendering (cached 24h)';
COMMENT ON COLUMN public.support_tickets.sentiment_trend_cache_generated_at IS 'Timestamp when sentiment_trend_cache was last generated';

-- ==============================================================================
-- 3. Enable RLS on reply_sentiments
-- ==============================================================================

ALTER TABLE public.reply_sentiments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "CSM can view sentiments for their ticket replies" ON public.reply_sentiments
FOR SELECT TO authenticated
USING (
  ticket_id IN (
    SELECT id FROM public.support_tickets WHERE assigned_to = auth.uid()
    OR account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  )
);

CREATE POLICY "Service role can do everything on reply_sentiments" ON public.reply_sentiments
FOR ALL TO service_role USING (true);

-- ==============================================================================
-- 4. Function to regenerate sentiment_trend_cache
-- ==============================================================================

CREATE OR REPLACE FUNCTION regenerate_sentiment_trend_cache(ticket_id_input uuid)
RETURNS jsonb AS $$
DECLARE
  trend_data jsonb;
BEGIN
  -- Get last 10 sentiments with timestamps for the ticket
  SELECT jsonb_agg(
    jsonb_build_object(
      'timestamp', stm.created_at,
      'sentiment', rs.sentiment,
      'score', rs.score,
      'keywords', rs.keywords
    )
    ORDER BY stm.created_at DESC
  )
  INTO trend_data
  FROM public.support_ticket_messages stm
  LEFT JOIN public.reply_sentiments rs ON stm.id = rs.reply_id
  WHERE stm.ticket_id = ticket_id_input
    AND stm.message_type = 'reply'
    AND rs.id IS NOT NULL
  LIMIT 10;

  RETURN COALESCE(trend_data, '[]'::jsonb);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 5. Function to detect negative trend and create event
-- ==============================================================================

CREATE OR REPLACE FUNCTION detect_negative_trend()
RETURNS TRIGGER AS $$
DECLARE
  negative_count integer;
  last_3_sentiments text[];
BEGIN
  -- Get last 3 consecutive sentiments for this ticket
  SELECT ARRAY_AGG(rs.sentiment ORDER BY rs.analyzed_at DESC)
  INTO last_3_sentiments
  FROM (
    SELECT rs.sentiment, rs.analyzed_at
    FROM public.reply_sentiments rs
    WHERE rs.ticket_id = NEW.ticket_id
    ORDER BY rs.analyzed_at DESC
    LIMIT 3
  ) rs;

  -- Check if all 3 are negative
  IF array_length(last_3_sentiments, 1) = 3
     AND last_3_sentiments[1] = 'negative'
     AND last_3_sentiments[2] = 'negative'
     AND last_3_sentiments[3] = 'negative' THEN

    -- Create negative trend event
    INSERT INTO public.ticket_events (ticket_id, event_type, created_by, payload)
    VALUES (NEW.ticket_id, 'negative_trend_detected', auth.uid(),
      jsonb_build_object('sentiment_count', 3, 'detected_at', now())
    );
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 6. Trigger to detect negative trends on sentiment insert
-- ==============================================================================

DROP TRIGGER IF EXISTS detect_negative_sentiment_trend ON public.reply_sentiments;

CREATE TRIGGER detect_negative_sentiment_trend
AFTER INSERT ON public.reply_sentiments
FOR EACH ROW
EXECUTE FUNCTION detect_negative_trend();

-- ==============================================================================
-- 7. View for tickets with stale sentiment cache (older than 24h)
-- ==============================================================================

CREATE OR REPLACE VIEW public.stale_sentiment_caches AS
SELECT
  st.id,
  st.title,
  st.status,
  st.assigned_to,
  st.sentiment_trend_cache_generated_at,
  EXTRACT(HOUR FROM (NOW() - st.sentiment_trend_cache_generated_at))::int as hours_since_generation
FROM public.support_tickets st
WHERE st.sentiment_trend_cache_generated_at IS NULL
   OR NOW() - st.sentiment_trend_cache_generated_at > INTERVAL '24 hours'
  AND st.status IN ('open', 'in_progress', 'resolved')
ORDER BY st.sentiment_trend_cache_generated_at ASC NULLS FIRST;

-- ==============================================================================
-- 8. Grant permissions
-- ==============================================================================

GRANT SELECT ON public.stale_sentiment_caches TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION regenerate_sentiment_trend_cache TO service_role;
GRANT EXECUTE ON FUNCTION detect_negative_trend TO service_role;


-- ==================================================
-- MIGRATION: 20260507_f2_02_health_score_ponderado.sql
-- ==================================================

-- Migration: F2-02 Weighted Health Score v2
-- Date: 2026-05-07
-- Objective: Add health_score_v2 with ponderada calculation (SLA 35%, NPS 30%, Adoption 25%, Relationship 10%)

-- ==============================================================================
-- 1. Add columns to accounts table for health_score_v2
-- ==============================================================================

ALTER TABLE public.accounts
ADD COLUMN IF NOT EXISTS health_score_v2 numeric DEFAULT 0.0,
ADD COLUMN IF NOT EXISTS health_breakdown jsonb,
ADD COLUMN IF NOT EXISTS health_classified_at timestamptz,
ADD COLUMN IF NOT EXISTS health_status varchar CHECK (health_status IN ('healthy', 'at-risk', 'critical'));

COMMENT ON COLUMN public.accounts.health_score_v2 IS 'Weighted health score v2: (SLA*0.35) + (NPS*0.30) + (Adoption*0.25) + (Relationship*0.10)';
COMMENT ON COLUMN public.accounts.health_breakdown IS 'JSON object with score breakdown: {sla, nps, adoption, relationship}';
COMMENT ON COLUMN public.accounts.health_classified_at IS 'Timestamp when health_status was last calculated';
COMMENT ON COLUMN public.accounts.health_status IS 'Classification: healthy (>=75), at-risk (50-74), critical (<50)';

-- ==============================================================================
-- 2. Create indices for health_score_v2 queries
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_accounts_health_score_v2
ON public.accounts(health_score_v2);

CREATE INDEX IF NOT EXISTS idx_accounts_health_status
ON public.accounts(health_status);

CREATE INDEX IF NOT EXISTS idx_accounts_health_classified_at
ON public.accounts(health_classified_at DESC);

-- GIN index for JSONB health_breakdown queries
CREATE INDEX IF NOT EXISTS idx_accounts_health_breakdown
ON public.accounts USING GIN(health_breakdown);

-- ==============================================================================
-- 3. RLS Policies for health_score_v2
-- ==============================================================================

-- CSM can view health_score_v2 for their accounts
CREATE POLICY IF NOT EXISTS "CSM can view health_score_v2 for their accounts"
ON public.accounts
FOR SELECT TO authenticated
USING (csm_owner_id = auth.uid());

-- Service role can update health_score_v2 (for cron)
CREATE POLICY IF NOT EXISTS "Service role can update health_score_v2"
ON public.accounts
FOR UPDATE TO service_role
USING (true)
WITH CHECK (true);

-- ==============================================================================
-- 4. Function to calculate SLA Score
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_sla_score(account_id_input uuid)
RETURNS numeric AS $$
DECLARE
  resolved_on_time integer;
  total_resolved integer;
  sla_score numeric;
BEGIN
  -- Count tickets resolved within SLA in last 30 days
  SELECT
    COUNT(CASE WHEN (resolved_at - due_date) <= INTERVAL '0 seconds' THEN 1 END),
    COUNT(*)
  INTO resolved_on_time, total_resolved
  FROM public.support_tickets
  WHERE account_id = account_id_input
    AND resolved_at IS NOT NULL
    AND resolved_at >= NOW() - INTERVAL '30 days';

  IF total_resolved = 0 THEN
    RETURN 50.0; -- Default if no resolved tickets
  END IF;

  sla_score := (resolved_on_time::numeric / total_resolved::numeric) * 100.0;
  RETURN ROUND(LEAST(100, GREATEST(0, sla_score)), 2);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 5. Function to calculate NPS Score (normalized)
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_nps_score(account_id_input uuid)
RETURNS numeric AS $$
DECLARE
  avg_nps numeric;
  nps_score numeric;
BEGIN
  -- Get average NPS from responses in last 90 days
  SELECT AVG(score::numeric)
  INTO avg_nps
  FROM public.nps_responses
  WHERE account_id = account_id_input
    AND created_at >= NOW() - INTERVAL '90 days';

  IF avg_nps IS NULL THEN
    RETURN 50.0; -- Default if no NPS data
  END IF;

  -- Normalize to 0-100 scale: (avgNPS + 100) / 2
  -- NPS ranges from -100 to 100, so normalized ranges from 0 to 100
  nps_score := ((avg_nps + 100.0) / 2.0);
  RETURN ROUND(LEAST(100, GREATEST(0, nps_score)), 2);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 6. Function to calculate Adoption Score
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_adoption_score(account_id_input uuid)
RETURNS numeric AS $$
DECLARE
  adoption_data jsonb;
  active_features integer;
  total_features integer;
  adoption_score numeric;
BEGIN
  -- Get latest adoption metrics
  SELECT adoption_metrics
  INTO adoption_data
  FROM public.adoption_metrics
  WHERE account_id = account_id_input
  ORDER BY created_at DESC
  LIMIT 1;

  IF adoption_data IS NULL THEN
    RETURN 50.0; -- Default if no adoption data
  END IF;

  -- Extract active and total features from JSONB
  active_features := COALESCE((adoption_data->>'active_features')::integer, 0);
  total_features := COALESCE((adoption_data->>'total_features')::integer, 1);

  IF total_features = 0 THEN
    RETURN 50.0;
  END IF;

  adoption_score := (active_features::numeric / total_features::numeric) * 100.0;
  RETURN ROUND(LEAST(100, GREATEST(0, adoption_score)), 2);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 7. Function to calculate Relationship Score (interaction frequency)
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_relationship_score(account_id_input uuid)
RETURNS numeric AS $$
DECLARE
  interaction_count integer;
  days_since_last integer;
  relationship_score numeric;
BEGIN
  -- Count interactions in last 30 days
  SELECT COUNT(*)
  INTO interaction_count
  FROM public.interactions
  WHERE account_id = account_id_input
    AND date >= NOW() - INTERVAL '30 days';

  -- Get days since last interaction
  SELECT EXTRACT(DAY FROM (NOW() - MAX(date)))::integer
  INTO days_since_last
  FROM public.interactions
  WHERE account_id = account_id_input
    AND date >= NOW() - INTERVAL '30 days';

  -- Score based on frequency buckets
  IF days_since_last IS NULL THEN
    relationship_score := 0.0; -- No interactions in 30 days
  ELSIF days_since_last <= 7 THEN
    relationship_score := 100.0;
  ELSIF days_since_last <= 14 THEN
    relationship_score := 75.0;
  ELSIF days_since_last <= 21 THEN
    relationship_score := 50.0;
  ELSIF days_since_last <= 30 THEN
    relationship_score := 25.0;
  ELSE
    relationship_score := 0.0;
  END IF;

  RETURN ROUND(relationship_score, 2);
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 8. Function to calculate Weighted Health Score v2
-- ==============================================================================

CREATE OR REPLACE FUNCTION calc_weighted_health_score(
  sla_score numeric,
  nps_score numeric,
  adoption_score numeric,
  relationship_score numeric
)
RETURNS jsonb AS $$
DECLARE
  weighted_score numeric;
  health_status varchar;
  result jsonb;
BEGIN
  -- Weighted calculation: SLA 35%, NPS 30%, Adoption 25%, Relationship 10%
  weighted_score := (sla_score * 0.35) + (nps_score * 0.30) + (adoption_score * 0.25) + (relationship_score * 0.10);
  weighted_score := ROUND(LEAST(100, GREATEST(0, weighted_score)), 2);

  -- Classify health status
  IF weighted_score >= 75 THEN
    health_status := 'healthy';
  ELSIF weighted_score >= 50 THEN
    health_status := 'at-risk';
  ELSE
    health_status := 'critical';
  END IF;

  -- Build result JSON
  result := jsonb_build_object(
    'score', weighted_score,
    'status', health_status,
    'breakdown', jsonb_build_object(
      'sla', sla_score,
      'nps', nps_score,
      'adoption', adoption_score,
      'relationship', relationship_score
    )
  );

  RETURN result;
END;
$$ LANGUAGE plpgsql;

-- ==============================================================================
-- 9. Grants for functions
-- ==============================================================================

GRANT EXECUTE ON FUNCTION calc_sla_score TO service_role;
GRANT EXECUTE ON FUNCTION calc_nps_score TO service_role;
GRANT EXECUTE ON FUNCTION calc_adoption_score TO service_role;
GRANT EXECUTE ON FUNCTION calc_relationship_score TO service_role;
GRANT EXECUTE ON FUNCTION calc_weighted_health_score TO service_role;

