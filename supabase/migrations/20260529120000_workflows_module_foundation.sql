-- ============================================================================
-- Módulo "Fluxos & Playbooks" — orquestrador de processos de CS (fundação)
-- Aditivo: cria tabelas/funções/triggers novas. Drop do legado playbook_* fica
-- para etapa posterior (após remover o código que o referencia).
-- ============================================================================

-- ─── Definição (design-time) ───────────────────────────────────────────────
create table if not exists public.workflow_definitions (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'ongoing'
    check (category in ('ongoing','onboarding','support')),
  version int not null default 1,
  status text not null default 'draft'
    check (status in ('draft','published','archived')),
  is_enabled boolean not null default false,
  created_by uuid references auth.users(id),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.workflow_nodes (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_definitions(id) on delete cascade,
  node_id text not null,
  node_type text not null check (node_type in
    ('trigger','condition','validation','branch','switch','loop','wait',
     'human_task','approval','action','http','code')),
  position_x numeric not null default 0,
  position_y numeric not null default 0,
  label text,
  config jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  unique (workflow_id, node_id)
);

create table if not exists public.workflow_edges (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_definitions(id) on delete cascade,
  source_node_id text not null,
  target_node_id text not null,
  edge_label text,
  created_at timestamptz not null default now()
);

-- ─── Motor: gatilhos / fila / dedup ─────────────────────────────────────────
create table if not exists public.workflow_triggers (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_definitions(id) on delete cascade,
  mode text not null default 'event' check (mode in ('event','scheduled','manual')),
  event_name text,
  schedule_cron text,
  filters jsonb not null default '{}'::jsonb,
  max_runs_per_hour int not null default 5,
  is_enabled boolean not null default false,
  next_scheduled_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_workflow_triggers_event on public.workflow_triggers(event_name) where is_enabled;

create table if not exists public.workflow_event_queue (
  id uuid primary key default gen_random_uuid(),
  event_name text not null,
  event_payload jsonb not null default '{}'::jsonb,
  account_id uuid,
  processed_at timestamptz,
  attempts int not null default 0,
  last_error text,
  created_at timestamptz not null default now()
);
create index if not exists idx_workflow_event_queue_unprocessed on public.workflow_event_queue(created_at) where processed_at is null;

create table if not exists public.workflow_dedup (
  workflow_id uuid not null references public.workflow_definitions(id) on delete cascade,
  dedup_key text not null,
  last_run_at timestamptz not null default now(),
  runs_in_window int not null default 1,
  primary key (workflow_id, dedup_key)
);

-- ─── Execução (run-time, durável) ───────────────────────────────────────────
create table if not exists public.workflow_runs (
  id uuid primary key default gen_random_uuid(),
  workflow_id uuid not null references public.workflow_definitions(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  triggered_by text not null default 'manual' check (triggered_by in ('event','scheduled','manual','test')),
  status text not null default 'running' check (status in ('running','waiting','success','failed','cancelled')),
  context jsonb not null default '{}'::jsonb,
  idempotency_key text,
  trigger_data jsonb not null default '{}'::jsonb,
  error text,
  started_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);
create index if not exists idx_workflow_runs_active on public.workflow_runs(status) where status in ('running','waiting');
create unique index if not exists uq_workflow_runs_idem on public.workflow_runs(idempotency_key) where idempotency_key is not null;

create table if not exists public.workflow_run_steps (
  id uuid primary key default gen_random_uuid(),
  run_id uuid not null references public.workflow_runs(id) on delete cascade,
  node_id text not null,
  node_type text,
  status text not null default 'pending'
    check (status in ('pending','running','waiting','success','failed','skipped')),
  wait_reason text check (wait_reason in ('human_task','approval','timer','http_callback','loop')),
  input_data jsonb not null default '{}'::jsonb,
  output_data jsonb not null default '{}'::jsonb,
  logs text[] not null default '{}',
  retry_count int not null default 0,
  iteration_index int,
  next_run_at timestamptz,
  sla_due_at timestamptz,
  error text,
  started_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now()
);
create index if not exists idx_run_steps_due on public.workflow_run_steps(status, next_run_at);
create index if not exists idx_run_steps_run on public.workflow_run_steps(run_id);

-- ─── Humano-no-loop: aprovações + link em csm_tasks ─────────────────────────
create table if not exists public.workflow_approvals (
  id uuid primary key default gen_random_uuid(),
  run_step_id uuid not null references public.workflow_run_steps(id) on delete cascade,
  account_id uuid references public.accounts(id) on delete set null,
  approver_id uuid references auth.users(id),
  approver_role text,
  title text not null,
  description text,
  status text not null default 'pending' check (status in ('pending','approved','rejected')),
  decided_by uuid references auth.users(id),
  decided_at timestamptz,
  comment text,
  created_at timestamptz not null default now()
);
create index if not exists idx_workflow_approvals_pending on public.workflow_approvals(status) where status = 'pending';

alter table public.csm_tasks add column if not exists workflow_run_step_id uuid references public.workflow_run_steps(id) on delete set null;

alter table public.csm_tasks drop constraint if exists csm_tasks_source_label_check;
alter table public.csm_tasks add constraint csm_tasks_source_label_check
  check (source_label in ('manual','adoption','time_entry','alert','playbook','workflow'));

-- ─── Função utilitária: enfileirar evento ───────────────────────────────────
create or replace function public.enqueue_workflow_event(p_event_name text, p_payload jsonb, p_account_id uuid)
returns void language plpgsql security definer as $$
begin
  insert into public.workflow_event_queue (event_name, event_payload, account_id)
  values (p_event_name, coalesce(p_payload, '{}'::jsonb), p_account_id);
end; $$;

-- ─── Triggers de captura de evento ──────────────────────────────────────────
create or replace function public.tr_wf_accounts_health() returns trigger language plpgsql security definer as $$
begin
  if (new.health_score is distinct from old.health_score) then
    perform public.enqueue_workflow_event('health_score_changed',
      jsonb_build_object('account_id', new.id, 'account_name', new.name,
        'old_score', old.health_score, 'new_score', new.health_score), new.id);
  end if;
  return new;
end; $$;
drop trigger if exists trg_wf_accounts_health on public.accounts;
create trigger trg_wf_accounts_health after update on public.accounts
  for each row execute function public.tr_wf_accounts_health();

create or replace function public.tr_wf_feature_adoption() returns trigger language plpgsql security definer as $$
begin
  if (old.status = 'in_use' and new.status in ('partial','blocked','not_started','na')
      and new.status is distinct from old.status) then
    perform public.enqueue_workflow_event('feature_adoption_changed',
      jsonb_build_object('account_id', new.account_id, 'feature_id', new.feature_id,
        'old_status', old.status, 'new_status', new.status), new.account_id);
  end if;
  return new;
end; $$;
drop trigger if exists trg_wf_feature_adoption on public.feature_adoption;
create trigger trg_wf_feature_adoption after update on public.feature_adoption
  for each row execute function public.tr_wf_feature_adoption();

create or replace function public.tr_wf_task_resume() returns trigger language plpgsql security definer as $$
begin
  if (new.workflow_run_step_id is not null
      and new.status in ('completed','cancelled')
      and new.status is distinct from old.status) then
    perform public.enqueue_workflow_event('human_task_completed',
      jsonb_build_object('run_step_id', new.workflow_run_step_id, 'task_id', new.id,
        'task_status', new.status), new.account_id);
  end if;
  return new;
end; $$;
drop trigger if exists trg_wf_task_resume on public.csm_tasks;
create trigger trg_wf_task_resume after update on public.csm_tasks
  for each row execute function public.tr_wf_task_resume();

-- ─── RLS (interno; gating fino no app via getModulePermission). Engine usa service role. ───
alter table public.workflow_definitions enable row level security;
alter table public.workflow_nodes       enable row level security;
alter table public.workflow_edges       enable row level security;
alter table public.workflow_triggers    enable row level security;
alter table public.workflow_event_queue enable row level security;
alter table public.workflow_dedup       enable row level security;
alter table public.workflow_runs        enable row level security;
alter table public.workflow_run_steps   enable row level security;
alter table public.workflow_approvals   enable row level security;

do $$
declare t text;
begin
  foreach t in array array[
    'workflow_definitions','workflow_nodes','workflow_edges','workflow_triggers',
    'workflow_event_queue','workflow_dedup','workflow_runs','workflow_run_steps','workflow_approvals'
  ] loop
    execute format('drop policy if exists wf_auth_all on public.%I;', t);
    execute format('create policy wf_auth_all on public.%I for all to authenticated using (true) with check (true);', t);
  end loop;
end $$;
