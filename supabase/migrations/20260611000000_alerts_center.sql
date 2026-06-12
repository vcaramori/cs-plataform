-- Central de Alertas (Wave 8)
-- Consolida o catálogo de alertas sobre `proactive_alerts`, vincula cada alerta à
-- entidade tratada dentro da ferramenta (tarefa, ticket, negociação...) e adiciona
-- leitura (lida/não-lida) por usuário. Mantém o índice único parcial existente
-- `proactive_alerts_daily_uniq (account_id, type) WHERE resolved_at IS NULL`.

-- 1) Tipos consolidados que antes só existiam no feed derivado do sininho.
alter type alert_type add value if not exists 'sla_breach';
alter type alert_type add value if not exists 'new_ticket';
alter type alert_type add value if not exists 'mention';
alter type alert_type add value if not exists 'discrepancy';
alter type alert_type add value if not exists 'stale_score';

-- 2) Vínculo alerta→entidade tratada + campos leves de tratamento manual (fallback).
alter table public.proactive_alerts
  add column if not exists linked_entity_type text,      -- 'csm_task' | 'support_ticket' | 'negotiation' | 'interaction' | null
  add column if not exists linked_entity_id   uuid,
  add column if not exists acknowledged_at    timestamptz,
  add column if not exists acknowledged_by    uuid references auth.users(id),
  add column if not exists resolved_by        uuid references auth.users(id),
  add column if not exists resolution_note    text;

create index if not exists idx_proactive_alerts_linked_entity
  on public.proactive_alerts (linked_entity_type, linked_entity_id);

-- 3) Leitura por usuário (lida/não-lida). Cada usuário só enxerga/gerencia as próprias leituras.
create table if not exists public.alert_reads (
  user_id  uuid not null references auth.users(id) on delete cascade,
  alert_id uuid not null references public.proactive_alerts(id) on delete cascade,
  read_at  timestamptz not null default now(),
  primary key (user_id, alert_id)
);

alter table public.alert_reads enable row level security;

do $$ begin
  create policy "own reads select" on public.alert_reads for select using (user_id = auth.uid());
exception when duplicate_object then null; end $$;

do $$ begin
  create policy "own reads write" on public.alert_reads for all using (user_id = auth.uid()) with check (user_id = auth.uid());
exception when duplicate_object then null; end $$;
