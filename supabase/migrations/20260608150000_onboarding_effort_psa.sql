-- ============================================================================
-- Esforço de Onboarding → integração PSA (apontamento de horas de implantação)
-- ----------------------------------------------------------------------------
-- Aditiva. Marca o estado do envio ao PSA por time_entry (idempotência/observa-
-- bilidade) e permite vincular um time_entry a um evento de onboarding ('effort')
-- para entrar no diário e na trilha RAG de onboarding.
-- ============================================================================

-- 1) Marcadores de sync PSA em time_entries (guard de idempotência = psa_synced_at)
alter table public.time_entries add column if not exists psa_sync_status text
  check (psa_sync_status in ('skipped','pending','synced','failed'));
alter table public.time_entries add column if not exists psa_synced_at timestamptz;
alter table public.time_entries add column if not exists psa_message text;

-- 2) Vincular esforço ao diário de onboarding + novo tipo de evento 'effort'
alter table public.onboarding_events add column if not exists time_entry_id uuid
  references public.time_entries(id) on delete set null;

alter table public.onboarding_events drop constraint if exists onboarding_events_event_type_check;
alter table public.onboarding_events add constraint onboarding_events_event_type_check
  check (event_type in ('note','meeting','blocker','decision','status_change','attachment','effort'));

create index if not exists onboarding_events_time_entry_idx
  on public.onboarding_events(time_entry_id) where time_entry_id is not null;

notify pgrst, 'reload schema';
