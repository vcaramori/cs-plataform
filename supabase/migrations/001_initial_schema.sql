-- CS-Continuum: Schema Inicial
-- Sprint 1 — Fundação

-- Extensões
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ==============================================================================
-- ACCOUNTS
-- ==============================================================================
CREATE TABLE public.accounts (
  id                UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  name              TEXT        NOT NULL,
  segment           TEXT        NOT NULL CHECK (segment IN ('SMB', 'Mid-Market', 'Enterprise')),
  csm_owner_id      UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  industry          TEXT,
  website           TEXT,
  health_score      NUMERIC(5,2) NOT NULL DEFAULT 50.00 CHECK (health_score >= 0 AND health_score <= 100),
  health_trend      TEXT        NOT NULL DEFAULT 'stable' CHECK (health_trend IN ('up', 'stable', 'down', 'critical')),
  created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_accounts_csm_owner ON public.accounts(csm_owner_id);
CREATE INDEX idx_accounts_segment   ON public.accounts(segment);

-- ==============================================================================
-- CONTRACTS
-- ==============================================================================
CREATE TABLE public.contracts (
  id                         UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id                 UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  mrr                        NUMERIC(12,2) NOT NULL CHECK (mrr >= 0),
  arr                        NUMERIC(12,2) GENERATED ALWAYS AS (mrr * 12) STORED,
  start_date                 DATE        NOT NULL,
  renewal_date               DATE        NOT NULL,
  service_type               TEXT        NOT NULL CHECK (service_type IN ('Basic', 'Professional', 'Enterprise', 'Custom')),
  status                     TEXT        NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'at-risk', 'churned', 'in-negotiation')),
  contracted_hours_monthly   NUMERIC(6,2) NOT NULL DEFAULT 0 CHECK (contracted_hours_monthly >= 0),
  csm_hour_cost              NUMERIC(8,2) NOT NULL DEFAULT 0 CHECK (csm_hour_cost >= 0),
  notes                      TEXT
);

CREATE INDEX idx_contracts_account_id    ON public.contracts(account_id);
CREATE INDEX idx_contracts_renewal_date  ON public.contracts(renewal_date);
CREATE INDEX idx_contracts_status        ON public.contracts(status);

-- ==============================================================================
-- CONTACTS (Power Map)
-- ==============================================================================
CREATE TABLE public.contacts (
  id                     UUID  PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id             UUID  NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  name                   TEXT  NOT NULL,
  role                   TEXT  NOT NULL,
  seniority              TEXT  NOT NULL CHECK (seniority IN ('C-Level', 'VP', 'Director', 'Manager', 'IC')),
  influence_level        TEXT  NOT NULL CHECK (influence_level IN ('Champion', 'Neutral', 'Detractor', 'Blocker')),
  decision_maker         BOOLEAN NOT NULL DEFAULT false,
  email                  TEXT,
  last_interaction_date  DATE,
  notes                  TEXT
);

CREATE INDEX idx_contacts_account_id ON public.contacts(account_id);

-- ==============================================================================
-- INTERACTIONS (Reuniões / Transcrições Read.ai)
-- ==============================================================================
CREATE TABLE public.interactions (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id           UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  contract_id          UUID        NOT NULL REFERENCES public.contracts(id) ON DELETE RESTRICT,
  csm_id               UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  type                 TEXT        NOT NULL CHECK (type IN ('meeting', 'email', 'qbr', 'onboarding', 'health-check', 'expansion', 'churn-risk')),
  title                TEXT        NOT NULL,
  date                 DATE        NOT NULL,
  direct_hours         NUMERIC(5,2) NOT NULL DEFAULT 0 CHECK (direct_hours >= 0),
  sentiment_score      NUMERIC(4,3) CHECK (sentiment_score >= -1 AND sentiment_score <= 1),
  alert_triggered      BOOLEAN     NOT NULL DEFAULT false,
  source               TEXT        NOT NULL DEFAULT 'manual' CHECK (source IN ('readai', 'manual', 'csv')),
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_interactions_account_id ON public.interactions(account_id);
CREATE INDEX idx_interactions_csm_id     ON public.interactions(csm_id);
CREATE INDEX idx_interactions_date       ON public.interactions(date DESC);
CREATE INDEX idx_interactions_alert      ON public.interactions(alert_triggered) WHERE alert_triggered = true;

-- ==============================================================================
-- TIME ENTRIES (Esforço Indireto — Back-office)
-- ==============================================================================
CREATE TABLE public.time_entries (
  id                      UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id              UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  interaction_id          UUID        REFERENCES public.interactions(id) ON DELETE SET NULL,
  csm_id                  UUID        NOT NULL REFERENCES auth.users(id) ON DELETE RESTRICT,
  activity_type           TEXT        NOT NULL CHECK (activity_type IN ('preparation', 'environment-analysis', 'strategy', 'reporting', 'internal-meeting', 'other')),
  natural_language_input  TEXT        NOT NULL,
  parsed_hours            NUMERIC(5,2) NOT NULL CHECK (parsed_hours > 0),
  parsed_description      TEXT        NOT NULL,
  date                    DATE        NOT NULL,
  logged_at               TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_time_entries_account_id ON public.time_entries(account_id);
CREATE INDEX idx_time_entries_csm_id     ON public.time_entries(csm_id);
CREATE INDEX idx_time_entries_date       ON public.time_entries(date DESC);

-- ==============================================================================
-- SUPPORT TICKETS
-- ==============================================================================
CREATE TABLE public.support_tickets (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id           UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  contract_id          UUID        REFERENCES public.contracts(id) ON DELETE SET NULL,
  external_ticket_id   TEXT,
  title                TEXT        NOT NULL,
  description          TEXT        NOT NULL,
  status               TEXT        NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in-progress', 'resolved', 'closed')),
  priority             TEXT        NOT NULL DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high', 'critical')),
  category             TEXT,
  opened_at            DATE        NOT NULL,
  resolved_at          DATE,
  source               TEXT        NOT NULL DEFAULT 'manual' CHECK (source IN ('csv', 'manual')),
  csv_filename         TEXT,
  created_at           TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tickets_account_id ON public.support_tickets(account_id);
CREATE INDEX idx_tickets_status     ON public.support_tickets(status);
CREATE INDEX idx_tickets_priority   ON public.support_tickets(priority);
CREATE INDEX idx_tickets_opened_at  ON public.support_tickets(opened_at DESC);

-- ==============================================================================
-- HEALTH SCORES (Histórico — Manual vs Shadow IA)
-- ==============================================================================
CREATE TABLE public.health_scores (
  id                   UUID        PRIMARY KEY DEFAULT uuid_generate_v4(),
  account_id           UUID        NOT NULL REFERENCES public.accounts(id) ON DELETE CASCADE,
  evaluated_at         DATE        NOT NULL DEFAULT CURRENT_DATE,
  -- Score manual do CSM
  manual_score         NUMERIC(5,2) CHECK (manual_score >= 0 AND manual_score <= 100),
  manual_notes         TEXT,
  -- Shadow Score (IA)
  shadow_score         NUMERIC(5,2) CHECK (shadow_score >= 0 AND shadow_score <= 100),
  shadow_reasoning     TEXT,
  -- Componentes do Shadow Score
  sentiment_component  NUMERIC(5,2),
  ticket_component     NUMERIC(5,2),
  engagement_component NUMERIC(5,2),
  -- Discrepância
  discrepancy          NUMERIC(5,2) GENERATED ALWAYS AS (
    CASE WHEN manual_score IS NOT NULL AND shadow_score IS NOT NULL
    THEN ABS(manual_score - shadow_score)
    ELSE NULL END
  ) STORED,
  discrepancy_alert    BOOLEAN     NOT NULL DEFAULT false,
  UNIQUE (account_id, evaluated_at)
);

CREATE INDEX idx_health_scores_account_id   ON public.health_scores(account_id);
CREATE INDEX idx_health_scores_evaluated_at ON public.health_scores(evaluated_at DESC);
CREATE INDEX idx_health_scores_discrepancy  ON public.health_scores(discrepancy_alert) WHERE discrepancy_alert = true;
