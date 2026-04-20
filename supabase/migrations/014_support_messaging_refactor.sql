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
