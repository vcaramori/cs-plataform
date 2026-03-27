-- CS-Continuum: Row Level Security Policies
-- Regra geral: CSM vê e opera apenas sobre suas próprias contas e registros

-- ==============================================================================
-- HABILITAR RLS EM TODAS AS TABELAS
-- ==============================================================================
ALTER TABLE public.accounts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contracts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contacts        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.interactions    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.time_entries    ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.health_scores   ENABLE ROW LEVEL SECURITY;

-- ==============================================================================
-- ACCOUNTS
-- ==============================================================================
CREATE POLICY "accounts_select_own" ON public.accounts
  FOR SELECT USING (csm_owner_id = auth.uid());

CREATE POLICY "accounts_insert_own" ON public.accounts
  FOR INSERT WITH CHECK (csm_owner_id = auth.uid());

CREATE POLICY "accounts_update_own" ON public.accounts
  FOR UPDATE USING (csm_owner_id = auth.uid());

CREATE POLICY "accounts_delete_own" ON public.accounts
  FOR DELETE USING (csm_owner_id = auth.uid());

-- ==============================================================================
-- CONTRACTS (visível se a conta pertence ao CSM)
-- ==============================================================================
CREATE POLICY "contracts_select_own" ON public.contracts
  FOR SELECT USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "contracts_insert_own" ON public.contracts
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "contracts_update_own" ON public.contracts
  FOR UPDATE USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "contracts_delete_own" ON public.contracts
  FOR DELETE USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

-- ==============================================================================
-- CONTACTS (visível se a conta pertence ao CSM)
-- ==============================================================================
CREATE POLICY "contacts_select_own" ON public.contacts
  FOR SELECT USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "contacts_insert_own" ON public.contacts
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "contacts_update_own" ON public.contacts
  FOR UPDATE USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "contacts_delete_own" ON public.contacts
  FOR DELETE USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

-- ==============================================================================
-- INTERACTIONS (visível se foi criada pelo CSM)
-- ==============================================================================
CREATE POLICY "interactions_select_own" ON public.interactions
  FOR SELECT USING (csm_id = auth.uid());

CREATE POLICY "interactions_insert_own" ON public.interactions
  FOR INSERT WITH CHECK (csm_id = auth.uid());

CREATE POLICY "interactions_update_own" ON public.interactions
  FOR UPDATE USING (csm_id = auth.uid());

CREATE POLICY "interactions_delete_own" ON public.interactions
  FOR DELETE USING (csm_id = auth.uid());

-- ==============================================================================
-- TIME ENTRIES
-- ==============================================================================
CREATE POLICY "time_entries_select_own" ON public.time_entries
  FOR SELECT USING (csm_id = auth.uid());

CREATE POLICY "time_entries_insert_own" ON public.time_entries
  FOR INSERT WITH CHECK (csm_id = auth.uid());

CREATE POLICY "time_entries_update_own" ON public.time_entries
  FOR UPDATE USING (csm_id = auth.uid());

CREATE POLICY "time_entries_delete_own" ON public.time_entries
  FOR DELETE USING (csm_id = auth.uid());

-- ==============================================================================
-- SUPPORT TICKETS (visível se a conta pertence ao CSM)
-- ==============================================================================
CREATE POLICY "tickets_select_own" ON public.support_tickets
  FOR SELECT USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "tickets_insert_own" ON public.support_tickets
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "tickets_update_own" ON public.support_tickets
  FOR UPDATE USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "tickets_delete_own" ON public.support_tickets
  FOR DELETE USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

-- ==============================================================================
-- HEALTH SCORES (visível se a conta pertence ao CSM)
-- ==============================================================================
CREATE POLICY "health_scores_select_own" ON public.health_scores
  FOR SELECT USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "health_scores_insert_own" ON public.health_scores
  FOR INSERT WITH CHECK (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );

CREATE POLICY "health_scores_update_own" ON public.health_scores
  FOR UPDATE USING (
    account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
  );
