-- Migration: F1-09 & F1-10 (Auto-close, Merge & Security Fixes)
-- Date: 2026-05-05

-- 1. Alterar support_tickets para suportar mesclagem
ALTER TABLE public.support_tickets 
ADD COLUMN IF NOT EXISTS merged_into UUID REFERENCES public.support_tickets(id),
ADD COLUMN IF NOT EXISTS merged_at TIMESTAMPTZ,
ADD COLUMN IF NOT EXISTS merge_count INTEGER DEFAULT 0;

-- 2. Criar tabela de histórico de mesclagem se não existir
CREATE TABLE IF NOT EXISTS public.ticket_merge_history (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    primary_ticket_id UUID NOT NULL REFERENCES public.support_tickets(id),
    secondary_ticket_id UUID NOT NULL REFERENCES public.support_tickets(id),
    merged_by UUID NOT NULL REFERENCES auth.users(id),
    reason TEXT,
    merged_at TIMESTAMPTZ DEFAULT timezone('utc'::text, now()),
    account_id UUID NOT NULL REFERENCES public.accounts(id)
);

-- 3. Ativar RLS em tabelas que estavam sem (Correção de Segurança)
ALTER TABLE public.ticket_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_merge_history ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.ticket_similarity_candidates ENABLE ROW LEVEL SECURITY;

-- 4. Adicionar Políticas de RLS baseadas em csm_owner_id
-- Nota: Usuários CSM só podem ver eventos de tickets de contas que eles gerenciam.

-- Política para ticket_events
DROP POLICY IF EXISTS "CSM can view events of their accounts" ON public.ticket_events;
CREATE POLICY "CSM can view events of their accounts" ON public.ticket_events
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.accounts a
        WHERE a.id = public.ticket_events.account_id
        AND a.csm_owner_id = auth.uid()
    )
);

-- Política para ticket_merge_history
DROP POLICY IF EXISTS "CSM can view merge history of their accounts" ON public.ticket_merge_history;
CREATE POLICY "CSM can view merge history of their accounts" ON public.ticket_merge_history
FOR ALL TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.accounts a
        WHERE a.id = public.ticket_merge_history.account_id
        AND a.csm_owner_id = auth.uid()
    )
);

-- Política para ticket_similarity_candidates
DROP POLICY IF EXISTS "CSM can view similarity candidates of their accounts" ON public.ticket_similarity_candidates;
CREATE POLICY "CSM can view similarity candidates of their accounts" ON public.ticket_similarity_candidates
FOR SELECT TO authenticated
USING (
    EXISTS (
        SELECT 1 FROM public.support_tickets t
        JOIN public.accounts a ON a.id = t.account_id
        WHERE t.id = public.ticket_similarity_candidates.ticket_id
        AND a.csm_owner_id = auth.uid()
    )
);

-- 5. Permitir que o service_role acesse tudo (necessário para cron jobs)
CREATE POLICY "Service role can do everything on ticket_events" ON public.ticket_events FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can do everything on ticket_merge_history" ON public.ticket_merge_history FOR ALL TO service_role USING (true);
CREATE POLICY "Service role can do everything on ticket_similarity_candidates" ON public.ticket_similarity_candidates FOR ALL TO service_role USING (true);
