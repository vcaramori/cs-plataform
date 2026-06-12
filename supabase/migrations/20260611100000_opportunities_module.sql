-- Módulo de Oportunidades (Wave 8) — espelho da Wishlist, foco COMERCIAL.
-- Modelo de dois níveis: opportunity_signals (menção) -> opportunity_items (oportunidade canônica)
-- + log de curadoria + handoffs. Pipedrive: sem envio automático (handoff = preparar/marcar enviado).

create table if not exists public.opportunity_items (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  need text,                       -- necessidade/problema comercial
  desired_outcome text,
  opportunity_type text not null default 'other'
    check (opportunity_type in ('upsell_plan','system_need','end_to_end_gap','other')),
  category text,
  status text not null default 'triage'
    check (status in ('triage','under_curation','qualified','ready_to_send','sent','won','lost','discarded')),
  priority text check (priority in ('low','medium','high','critical')),
  demand_accounts int not null default 0,
  demand_arr numeric not null default 0,
  estimated_value numeric,         -- valor estimado da oportunidade (opcional)
  owner_id uuid references auth.users(id),
  commercial_brief jsonb,          -- brief montado para o Pipedrive
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  sent_at timestamptz,             -- quando foi marcado como enviado ao Pipedrive
  sent_by uuid references auth.users(id)
);

create table if not exists public.opportunity_signals (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  item_id uuid references public.opportunity_items(id) on delete set null,
  source_type text not null
    check (source_type in ('interaction','time_entry','nps_response','support_ticket','manual')),
  source_id text,
  verbatim text not null,
  summary text,
  opportunity_type text not null default 'other'
    check (opportunity_type in ('upsell_plan','system_need','end_to_end_gap','other')),
  requester_name text,
  requester_email text,
  created_by uuid references auth.users(id),
  ai_extracted boolean not null default false,
  ai_confidence numeric,
  triage_outcome text not null default 'pending'
    check (triage_outcome in ('pending','already_available','promoted','duplicate','dismissed')),
  triage_note text,
  matched_plan_id uuid references public.subscription_plans(id),     -- "já existe no plano Y" (upsell)
  matched_feature_id uuid references public.product_features(id),
  triaged_by uuid references auth.users(id),
  triaged_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_opportunity_signals_account on public.opportunity_signals(account_id);
create index if not exists idx_opportunity_signals_item on public.opportunity_signals(item_id);
create index if not exists idx_opportunity_signals_triage on public.opportunity_signals(triage_outcome);
create index if not exists idx_opportunity_signals_source on public.opportunity_signals(source_type, source_id);

create table if not exists public.opportunity_curation_log (
  id uuid primary key default gen_random_uuid(),
  item_id uuid references public.opportunity_items(id) on delete cascade,
  signal_id uuid references public.opportunity_signals(id) on delete cascade,
  actor_id uuid not null references auth.users(id),
  action text not null,
  from_status text,
  to_status text,
  note text,
  created_at timestamptz not null default now()
);

create table if not exists public.opportunity_handoffs (
  id uuid primary key default gen_random_uuid(),
  item_id uuid not null references public.opportunity_items(id) on delete cascade,
  payload jsonb,
  target text not null default 'pipedrive' check (target in ('pipedrive','export','webhook')),
  status text not null default 'prepared' check (status in ('prepared','sent','failed')),
  note text,
  created_by uuid references auth.users(id),
  created_at timestamptz not null default now()
);

alter table public.opportunity_items enable row level security;
alter table public.opportunity_signals enable row level security;
alter table public.opportunity_curation_log enable row level security;
alter table public.opportunity_handoffs enable row level security;

-- RLS permissiva (gating fino no app), espelho do wl_auth_all da wishlist
do $$ begin create policy opp_items_auth_all on public.opportunity_items for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy opp_signals_auth_all on public.opportunity_signals for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy opp_log_auth_all on public.opportunity_curation_log for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;
do $$ begin create policy opp_handoffs_auth_all on public.opportunity_handoffs for all to authenticated using (true) with check (true); exception when duplicate_object then null; end $$;

-- Embeddings: permitir vetorizar sinais de oportunidade (dedup cross-customer)
alter table public.embeddings drop constraint if exists embeddings_source_type_check;
alter table public.embeddings add constraint embeddings_source_type_check
  check (source_type = any (array['interaction','support_ticket','nps_response','wishlist_signal','onboarding','negotiation','opportunity_signal']));
