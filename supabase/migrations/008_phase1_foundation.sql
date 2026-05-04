-- CS-Continuum: Phase 1 Foundation Tables
-- Decisões de schema pré-F1: saved_views, queue config, merge history, similarity candidates, timeline, ticket events

-- ==============================================================================
-- SAVED_VIEWS — Views salvas por usuário (F1-01)
-- ==============================================================================
CREATE TABLE public.saved_views (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  account_id uuid REFERENCES public.accounts(id) ON DELETE CASCADE,
  name text NOT NULL,
  entity_type text DEFAULT 'support_ticket' CHECK (entity_type IN ('support_ticket', 'account', 'playbook')),
  filters jsonb NOT NULL,
  icon text DEFAULT 'list' CHECK (icon IN ('list', 'alert', 'user', 'checkmark', 'star', 'clock', 'zap', 'filter')),
  visibility text DEFAULT 'personal' CHECK (visibility IN ('personal', 'team')),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE(user_id, name, entity_type)
);

CREATE INDEX idx_saved_views_user_id ON public.saved_views(user_id);
CREATE INDEX idx_saved_views_user_entity ON public.saved_views(user_id, entity_type);

-- RLS: Users can only see/edit their own views, or team views within same account
ALTER TABLE public.saved_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_or_team_views" ON public.saved_views
  FOR SELECT USING (
    user_id = auth.uid() OR
    (visibility = 'team' AND account_id IN (
      SELECT account_id FROM public.accounts WHERE csm_owner_id = auth.uid()
    ))
  );

CREATE POLICY "users_can_insert_own_views" ON public.saved_views
  FOR INSERT WITH CHECK (user_id = auth.uid());

CREATE POLICY "users_can_update_own_views" ON public.saved_views
  FOR UPDATE USING (user_id = auth.uid());

CREATE POLICY "users_can_delete_own_views" ON public.saved_views
  FOR DELETE USING (user_id = auth.uid());

-- ==============================================================================
-- CSM_QUEUE_CONFIG — Queue capacity por CSM (F1-14)
-- ==============================================================================
CREATE TABLE public.csm_queue_config (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  max_concurrent_tickets int DEFAULT 20 CHECK (max_concurrent_tickets > 0),
  is_available bool DEFAULT true,
  updated_at timestamptz DEFAULT now()
);

CREATE INDEX idx_csm_queue_config_user_id ON public.csm_queue_config(user_id);

ALTER TABLE public.csm_queue_config ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_own_queue_config" ON public.csm_queue_config
  FOR SELECT USING (user_id = auth.uid());

CREATE POLICY "users_can_update_own_queue_config" ON public.csm_queue_config
  FOR UPDATE USING (user_id = auth.uid());

-- ==============================================================================
-- TICKET_MERGE_HISTORY — Histórico de merges (F1-10)
-- ==============================================================================
CREATE TABLE public.ticket_merge_history (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  primary_ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  secondary_ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  merged_at timestamptz DEFAULT now(),
  merged_by uuid NOT NULL REFERENCES auth.users(id),
  reason text,
  CONSTRAINT different_tickets CHECK (primary_ticket_id != secondary_ticket_id)
);

CREATE INDEX idx_ticket_merge_history_primary ON public.ticket_merge_history(primary_ticket_id);
CREATE INDEX idx_ticket_merge_history_secondary ON public.ticket_merge_history(secondary_ticket_id);

-- ==============================================================================
-- TICKET_SIMILARITY_CANDIDATES — Detecção de duplicatas (F1-11)
-- ==============================================================================
CREATE TABLE public.ticket_similarity_candidates (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_a_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  ticket_b_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  similarity_score float NOT NULL CHECK (similarity_score >= 0 AND similarity_score <= 1),
  detected_at timestamptz DEFAULT now(),
  status text DEFAULT 'pending_review' CHECK (status IN ('pending_review', 'confirmed_duplicate', 'dismissed')),
  reviewed_by uuid REFERENCES auth.users(id),
  reviewed_at timestamptz,
  CONSTRAINT different_tickets CHECK (ticket_a_id != ticket_b_id),
  UNIQUE(ticket_a_id, ticket_b_id)
);

CREATE INDEX idx_ticket_similarity_candidates_status ON public.ticket_similarity_candidates(status);
CREATE INDEX idx_ticket_similarity_candidates_score ON public.ticket_similarity_candidates(similarity_score DESC);

-- ==============================================================================
-- TICKET_EVENTS — Auditoria de eventos em tickets (F1-01+)
-- ==============================================================================
CREATE TABLE public.ticket_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  ticket_id uuid NOT NULL REFERENCES public.support_tickets(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  payload jsonb,
  triggered_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_ticket_events_ticket_id ON public.ticket_events(ticket_id);
CREATE INDEX idx_ticket_events_created_at ON public.ticket_events(created_at DESC);
CREATE INDEX idx_ticket_events_event_type ON public.ticket_events(event_type);

-- ==============================================================================
-- TIMELINE_EVENTS — Timeline unificada da conta (F2-01)
-- ==============================================================================
CREATE TABLE public.timeline_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  account_id uuid NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  event_type text NOT NULL,
  source_table text,
  source_id uuid NOT NULL,
  occurred_at timestamptz NOT NULL,
  metadata jsonb,
  created_by uuid REFERENCES auth.users(id),
  created_at timestamptz DEFAULT now()
);

CREATE INDEX idx_timeline_events_account_id_occurred_at ON public.timeline_events(account_id, occurred_at DESC);
CREATE INDEX idx_timeline_events_event_type ON public.timeline_events(event_type);

ALTER TABLE public.timeline_events ENABLE ROW LEVEL SECURITY;

CREATE POLICY "users_can_view_account_timeline" ON public.timeline_events
  FOR SELECT USING (
    account_id IN (
      SELECT id FROM public.accounts WHERE csm_owner_id = auth.uid()
    )
  );
