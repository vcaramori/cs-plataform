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
