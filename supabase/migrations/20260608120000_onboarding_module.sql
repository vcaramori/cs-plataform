-- ============================================================================
-- Módulo de Onboarding + Histórico de Negociação + tipos de fonte no RAG
-- ----------------------------------------------------------------------------
-- Contexto: o produto está em produção. Esta migration é ADITIVA (sem drop de
-- dados): cria o catálogo/estrutura de onboarding por contrato, (re)cria o
-- histórico de negociação (a tabela do Epic 17 nunca foi aplicada no remoto) já
-- cobrindo venda inicial, e amplia o discriminador do RAG (`embeddings`) para
-- as trilhas 'onboarding' e 'negotiation'. Visibilidade segue o modelo vigente:
-- todo usuário INTERNO (is_internal_user) lê/escreve; portal/externo é bloqueado.
-- ============================================================================

-- 0) Catálogo de etapas de onboarding (data-driven; permite editar sem deploy) --
create table if not exists public.onboarding_stages (
  id          uuid primary key default gen_random_uuid(),
  key         text unique not null,
  label       text not null,
  sort_order  int  not null default 0,
  is_active   boolean not null default true,
  created_at  timestamptz not null default now()
);

-- Jornada padrão (9 etapas) definida pelo CS. Idempotente.
insert into public.onboarding_stages (key, label, sort_order) values
  ('welcome_meeting', 'Welcome Meeting (passagem comercial → CS)', 1),
  ('kickoff',         'Kickoff',                                   2),
  ('gts',             'GTs (agendas de entrevista)',               3),
  ('instance_setup',  'Criação da instância & configuração',       4),
  ('training',        'Treinamentos',                              5),
  ('go_live',         'Go Live',                                   6),
  ('hypercare',       'Hypercare',                                 7),
  ('ready',           'Tudo pronto',                               8),
  ('handover',        'Handover (Onboarding Kickoff)',             9)
on conflict (key) do update
  set label = excluded.label, sort_order = excluded.sort_order;

-- 1) Header de onboarding por contrato (colunas em contracts) -----------------
alter table public.contracts add column if not exists onboarding_status text not null default 'not-started'
  check (onboarding_status in ('not-started','in-progress','on-hold','completed','cancelled'));
alter table public.contracts add column if not exists onboarding_current_stage text;
alter table public.contracts add column if not exists onboarding_owner_id uuid references auth.users(id) on delete set null;
alter table public.contracts add column if not exists onboarding_started_at timestamptz;
alter table public.contracts add column if not exists onboarding_target_go_live date;
alter table public.contracts add column if not exists onboarding_completed_at timestamptz;
alter table public.contracts add column if not exists onboarding_health text not null default 'on-track'
  check (onboarding_health in ('on-track','at-risk','stalled'));

create index if not exists contracts_onboarding_status_idx on public.contracts(onboarding_status)
  where onboarding_status <> 'not-started';
create index if not exists contracts_onboarding_owner_idx on public.contracts(onboarding_owner_id)
  where onboarding_owner_id is not null;

-- 2) Checklist por contrato (uma linha por etapa) -----------------------------
create table if not exists public.onboarding_milestones (
  id             uuid primary key default gen_random_uuid(),
  contract_id    uuid not null references public.contracts(id) on delete cascade,
  account_id     uuid not null references public.accounts(id)  on delete cascade,
  stage_key      text not null,
  status         text not null default 'pending' check (status in ('pending','in-progress','done','skipped')),
  planned_date   date,
  completed_date date,
  owner_id       uuid references auth.users(id) on delete set null,
  notes          text,
  sort_order     int not null default 0,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (contract_id, stage_key)
);
create index if not exists onboarding_milestones_contract_idx on public.onboarding_milestones(contract_id);
create index if not exists onboarding_milestones_account_idx  on public.onboarding_milestones(account_id);

-- 3) Diário/eventos de onboarding (unidade ingerida no RAG) -------------------
create table if not exists public.onboarding_events (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null references public.contracts(id) on delete cascade,
  account_id   uuid not null references public.accounts(id)  on delete cascade,
  milestone_id uuid references public.onboarding_milestones(id) on delete set null,
  event_type   text not null default 'note'
    check (event_type in ('note','meeting','blocker','decision','status_change','attachment')),
  title        text,
  description  text,
  date         timestamptz not null default now(),
  created_by   uuid references auth.users(id) on delete set null,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists onboarding_events_contract_idx on public.onboarding_events(contract_id);
create index if not exists onboarding_events_account_idx  on public.onboarding_events(account_id);
create index if not exists onboarding_events_date_idx     on public.onboarding_events(date);

-- 4) Histórico de negociação (CREATE — não existe no remoto; já com venda inicial)
create table if not exists public.contract_negotiation_history (
  id                    uuid primary key default gen_random_uuid(),
  contract_id           uuid not null references public.contracts(id) on delete cascade,
  account_id            uuid not null references public.accounts(id)  on delete cascade,
  negotiation_type      text not null default 'renewal'
    check (negotiation_type in ('initial','renewal','renegotiation')),
  date                  timestamptz not null default now(),
  discount_offered_pct  numeric default 0,
  discount_accepted_pct numeric default 0,
  main_objection        text,
  closing_argument      text,
  counterpart_name      text,
  counterpart_role      text,
  outcome               text check (outcome in ('won','renewed','lost','pending')),
  notes                 text,
  created_by            uuid references auth.users(id) on delete set null,
  created_at            timestamptz not null default now(),
  updated_at            timestamptz not null default now()
);
create index if not exists cnh_contract_idx on public.contract_negotiation_history(contract_id);
create index if not exists cnh_account_idx  on public.contract_negotiation_history(account_id);
create index if not exists cnh_date_idx     on public.contract_negotiation_history(date);

-- 5) Triggers updated_at (reusa public.set_updated_at) ------------------------
drop trigger if exists onboarding_milestones_set_updated_at on public.onboarding_milestones;
create trigger onboarding_milestones_set_updated_at before update on public.onboarding_milestones
  for each row execute function public.set_updated_at();

drop trigger if exists onboarding_events_set_updated_at on public.onboarding_events;
create trigger onboarding_events_set_updated_at before update on public.onboarding_events
  for each row execute function public.set_updated_at();

drop trigger if exists cnh_set_updated_at on public.contract_negotiation_history;
create trigger cnh_set_updated_at before update on public.contract_negotiation_history
  for each row execute function public.set_updated_at();

-- 6) RLS — interno lê/escreve; portal/externo bloqueado (modelo vigente) ------
alter table public.onboarding_stages          enable row level security;
alter table public.onboarding_milestones       enable row level security;
alter table public.onboarding_events           enable row level security;
alter table public.contract_negotiation_history enable row level security;

-- Catálogo: leitura para todo interno (escrita só via admin/migration).
drop policy if exists onboarding_stages_internal_select on public.onboarding_stages;
create policy onboarding_stages_internal_select on public.onboarding_stages
  for select using (public.is_internal_user());

drop policy if exists onboarding_milestones_internal_all on public.onboarding_milestones;
create policy onboarding_milestones_internal_all on public.onboarding_milestones
  for all using (public.is_internal_user()) with check (public.is_internal_user());

drop policy if exists onboarding_events_internal_all on public.onboarding_events;
create policy onboarding_events_internal_all on public.onboarding_events
  for all using (public.is_internal_user()) with check (public.is_internal_user());

drop policy if exists cnh_internal_all on public.contract_negotiation_history;
create policy cnh_internal_all on public.contract_negotiation_history
  for all using (public.is_internal_user()) with check (public.is_internal_user());

-- 7) RAG — ampliar discriminador de fonte (recriado com o conjunto completo) ---
alter table public.embeddings drop constraint if exists embeddings_source_type_check;
alter table public.embeddings add constraint embeddings_source_type_check
  check (source_type in ('interaction','support_ticket','nps_response','wishlist_signal','onboarding','negotiation'));

comment on column public.embeddings.source_type is
  'Discriminador da fonte: interaction | support_ticket | nps_response | wishlist_signal | onboarding | negotiation.';

notify pgrst, 'reload schema';
