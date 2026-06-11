-- Curadoria de risco: registro humano de confirmação / falso positivo + motivo.
-- Alimenta a auditoria e o contexto da IA (predictive-risk + RAG) para não repetir o erro.
create table if not exists public.risk_curation_feedback (
  id          uuid primary key default gen_random_uuid(),
  account_id  uuid not null references public.accounts(id) on delete cascade,
  source      text not null check (source in ('alert','assessment')),
  source_id   uuid,
  risk_key    text,
  decision    text not null check (decision in ('confirmed','false_positive')),
  reason      text,
  curator_id  uuid references public.profiles(id) on delete set null,
  created_at  timestamptz not null default now()
);

create index if not exists idx_risk_curation_account_created
  on public.risk_curation_feedback (account_id, created_at desc);

alter table public.risk_curation_feedback enable row level security;

drop policy if exists risk_curation_select on public.risk_curation_feedback;
create policy risk_curation_select on public.risk_curation_feedback
  for select to authenticated using (true);

drop policy if exists risk_curation_insert on public.risk_curation_feedback;
create policy risk_curation_insert on public.risk_curation_feedback
  for insert to authenticated with check (curator_id = auth.uid());

notify pgrst, 'reload schema';
