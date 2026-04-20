-- Migration 012: Support SLA

CREATE TABLE public.sla_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    contract_id UUID NOT NULL UNIQUE REFERENCES public.contracts(id) ON DELETE CASCADE,
    alert_threshold_pct INT NOT NULL DEFAULT 25,
    auto_close_hours INT NOT NULL DEFAULT 48,
    timezone TEXT NOT NULL DEFAULT 'America/Sao_Paulo',
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.sla_policy_levels (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES public.sla_policies(id) ON DELETE CASCADE,
    level TEXT NOT NULL CHECK (level IN ('critical', 'high', 'medium', 'low')),
    first_response_minutes INT NOT NULL,
    resolution_minutes INT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(policy_id, level)
);

CREATE TABLE public.sla_level_mappings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    policy_id UUID NOT NULL REFERENCES public.sla_policies(id) ON DELETE CASCADE,
    external_label TEXT NOT NULL,
    internal_level TEXT NOT NULL CHECK (internal_level IN ('critical', 'high', 'medium', 'low')),
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    UNIQUE(policy_id, external_label)
);

CREATE TABLE public.business_hours (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    scope TEXT NOT NULL CHECK (scope IN ('global', 'account')),
    account_id UUID REFERENCES public.accounts(id) ON DELETE CASCADE,
    dow INT NOT NULL CHECK (dow >= 0 AND dow <= 6),
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.sla_events (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL,
    occurred_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    metadata JSONB
);

CREATE TABLE public.csat_responses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    account_id UUID NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
    score INT NOT NULL CHECK (score >= 1 AND score <= 5),
    comment TEXT,
    respondent_email TEXT NOT NULL,
    answered_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

CREATE TABLE public.csat_tokens (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ticket_id UUID NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
    token UUID NOT NULL UNIQUE DEFAULT gen_random_uuid(),
    expires_at TIMESTAMPTZ NOT NULL,
    used_at TIMESTAMPTZ,
    email_delivery_failed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Alter support_tickets
ALTER TABLE public.support_tickets 
    ADD COLUMN external_priority_label TEXT,
    ADD COLUMN internal_level TEXT CHECK (internal_level IN ('critical','high','medium','low')),
    ADD COLUMN sla_policy_id UUID REFERENCES public.sla_policies(id) ON DELETE SET NULL,
    
    ADD COLUMN first_response_deadline TIMESTAMPTZ,
    ADD COLUMN first_response_attention_at TIMESTAMPTZ,
    ADD COLUMN resolution_deadline TIMESTAMPTZ,
    ADD COLUMN resolution_attention_at TIMESTAMPTZ,
    
    ADD COLUMN first_response_at TIMESTAMPTZ,
    ADD COLUMN closed_at TIMESTAMPTZ,
    
    ADD COLUMN assigned_to UUID REFERENCES auth.users(id),
    ADD COLUMN first_assigned_to UUID REFERENCES auth.users(id),
    ADD COLUMN parent_ticket_id UUID REFERENCES public.support_tickets(id) ON DELETE SET NULL,
    
    ADD COLUMN sla_breach_first_response BOOLEAN NOT NULL DEFAULT false,
    ADD COLUMN sla_breach_resolution BOOLEAN NOT NULL DEFAULT false,
    
    ADD COLUMN sla_status_first_response TEXT CHECK (sla_status_first_response IN ('no_prazo','atencao','vencido','cumprido','violado')),
    ADD COLUMN sla_status_resolution TEXT CHECK (sla_status_resolution IN ('no_prazo','atencao','vencido','cumprido','violado'));

-- Drop old status check
ALTER TABLE public.support_tickets DROP CONSTRAINT IF EXISTS support_tickets_status_check;

-- Migrate old status values before applying new constraints
UPDATE public.support_tickets SET status = 'in_progress' WHERE status = 'in-progress';

-- Add new constraint
ALTER TABLE public.support_tickets ADD CONSTRAINT support_tickets_status_check CHECK (status IN ('open','in_progress','resolved','closed','reopened'));

-- Indexes
CREATE INDEX idx_sla_policies_account ON public.sla_policies(account_id);
CREATE INDEX idx_level_mappings_policy ON public.sla_level_mappings(policy_id);
CREATE INDEX idx_business_hours_scope ON public.business_hours(scope, account_id);
CREATE INDEX idx_sla_events_ticket ON public.sla_events(ticket_id, occurred_at DESC);
CREATE INDEX idx_sla_events_type ON public.sla_events(event_type);
CREATE INDEX idx_csat_ticket ON public.csat_responses(ticket_id);
CREATE INDEX idx_csat_account ON public.csat_responses(account_id, answered_at DESC);
CREATE INDEX idx_support_tickets_sla ON public.support_tickets(status, sla_policy_id);

-- RLS
ALTER TABLE public.sla_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_policy_levels ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_level_mappings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.business_hours ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.sla_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_responses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.csat_tokens ENABLE ROW LEVEL SECURITY;

-- SLA Policies Policy
CREATE POLICY "CSM can view and manage their account SLA policies" ON public.sla_policies
    FOR ALL USING (account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()));

-- SLA Policy Levels Policy
CREATE POLICY "CSM can view and manage their policy levels" ON public.sla_policy_levels
    FOR ALL USING (policy_id IN (
        SELECT sp.id FROM public.sla_policies sp
        JOIN public.accounts a ON a.id = sp.account_id
        WHERE a.csm_owner_id = auth.uid()
    ));

-- SLA Level Mappings Policy
CREATE POLICY "CSM can view and manage their level mappings" ON public.sla_level_mappings
    FOR ALL USING (policy_id IN (
        SELECT sp.id FROM public.sla_policies sp
        JOIN public.accounts a ON a.id = sp.account_id
        WHERE a.csm_owner_id = auth.uid()
    ));

-- Business Hours Policy
CREATE POLICY "Use global business hours or account specific" ON public.business_hours
    FOR ALL USING (
        scope = 'global' OR 
        account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid())
    );

-- SLA Events Policy
CREATE POLICY "CSM can view events for their tickets" ON public.sla_events
    FOR ALL USING (ticket_id IN (
        SELECT st.id FROM public.support_tickets st
        JOIN public.accounts a ON a.id = st.account_id
        WHERE a.csm_owner_id = auth.uid()
    ));

-- CSAT Responses Policy
CREATE POLICY "CSM can view their account CSAT" ON public.csat_responses
    FOR ALL USING (account_id IN (SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()));

-- CSAT Tokens Policy
CREATE POLICY "CSM can view tokens for their tickets" ON public.csat_tokens
    FOR ALL USING (ticket_id IN (
        SELECT st.id FROM public.support_tickets st
        JOIN public.accounts a ON a.id = st.account_id
        WHERE a.csm_owner_id = auth.uid()
    ));

-- Seed Default Global Business Hours (Mon-Fri, 09:00 - 18:00)
INSERT INTO public.business_hours (scope, dow, start_time, end_time) VALUES
('global', 1, '09:00', '18:00'),
('global', 2, '09:00', '18:00'),
('global', 3, '09:00', '18:00'),
('global', 4, '09:00', '18:00'),
('global', 5, '09:00', '18:00');
