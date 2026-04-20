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
