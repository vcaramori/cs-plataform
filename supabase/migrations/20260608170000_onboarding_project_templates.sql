-- ============================================================================
-- Onboarding como PROJETO: biblioteca de templates + marcos datados livres
-- ----------------------------------------------------------------------------
-- Aditiva. Transforma o checklist fixo (onboarding_stages + UNIQUE(stage_key))
-- num modelo de projeto: marcos livres com data/status, instanciados a partir
-- de templates por tipo. O checklist legado continua funcionando.
-- ============================================================================

-- 1) Biblioteca de templates ---------------------------------------------------
create table if not exists public.onboarding_templates (
  id           uuid primary key default gen_random_uuid(),
  name         text not null,
  description  text,
  project_type text,
  is_active    boolean not null default true,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create table if not exists public.onboarding_template_items (
  id            uuid primary key default gen_random_uuid(),
  template_id   uuid not null references public.onboarding_templates(id) on delete cascade,
  name          text not null,
  milestone_type text not null default 'milestone',
  offset_days   int not null default 0,   -- a partir da data de início (kickoff)
  duration_days int not null default 0,   -- 0 = marco-ponto; >0 = barra
  sort_order    int not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists onboarding_template_items_template_idx on public.onboarding_template_items(template_id);

-- 2) Evoluir onboarding_milestones para marcos livres -------------------------
alter table public.onboarding_milestones add column if not exists name text;
alter table public.onboarding_milestones add column if not exists milestone_type text;
alter table public.onboarding_milestones add column if not exists planned_end date;
alter table public.onboarding_milestones add column if not exists template_item_id uuid;
alter table public.onboarding_milestones alter column stage_key drop not null;
alter table public.onboarding_milestones drop constraint if exists onboarding_milestones_contract_id_stage_key_key;

-- Backfill do nome dos marcos legados a partir do label da etapa
update public.onboarding_milestones m
  set name = coalesce(s.label, m.stage_key)
  from public.onboarding_stages s
  where m.name is null and m.stage_key is not null and s.key = m.stage_key;
update public.onboarding_milestones set name = coalesce(name, stage_key, 'Marco') where name is null;

-- 3) contracts: template usado ------------------------------------------------
alter table public.contracts add column if not exists onboarding_template_id uuid
  references public.onboarding_templates(id) on delete set null;

-- 4) Trigger updated_at no template
drop trigger if exists onboarding_templates_set_updated_at on public.onboarding_templates;
create trigger onboarding_templates_set_updated_at before update on public.onboarding_templates
  for each row execute function public.set_updated_at();

-- 5) RLS (mesmo modelo: interno lê/escreve; externo bloqueado) ----------------
alter table public.onboarding_templates      enable row level security;
alter table public.onboarding_template_items enable row level security;

drop policy if exists onboarding_templates_internal_all on public.onboarding_templates;
create policy onboarding_templates_internal_all on public.onboarding_templates
  for all using (public.is_internal_user()) with check (public.is_internal_user());

drop policy if exists onboarding_template_items_internal_all on public.onboarding_template_items;
create policy onboarding_template_items_internal_all on public.onboarding_template_items
  for all using (public.is_internal_user()) with check (public.is_internal_user());

-- 6) Seed da biblioteca (idempotente por nome) --------------------------------
insert into public.onboarding_templates (name, description, project_type)
select 'Implantação Padrão (5+5 semanas)', 'Kick off, 4 GTs, 4 treinamentos, Go Live e Handover.', 'padrao'
where not exists (select 1 from public.onboarding_templates where name = 'Implantação Padrão (5+5 semanas)');

insert into public.onboarding_template_items (template_id, name, milestone_type, offset_days, sort_order)
select t.id, x.name, x.mtype, x.off, x.ord
from public.onboarding_templates t
cross join (values
  ('Kick off','kickoff',0,1),
  ('1º GT','workteam',11,2),
  ('2º GT','workteam',14,3),
  ('3º GT','workteam',21,4),
  ('4º GT','workteam',32,5),
  ('1ª TS','training',35,6),
  ('2ª TS','training',42,7),
  ('3ª TS','training',49,8),
  ('4ª TS','training',56,9),
  ('Go Live','go_live',63,10),
  ('Handover p/ CS','handover',70,11)
) as x(name, mtype, off, ord)
where t.name = 'Implantação Padrão (5+5 semanas)'
  and not exists (select 1 from public.onboarding_template_items i where i.template_id = t.id);

insert into public.onboarding_templates (name, description, project_type)
select 'Implantação Express (3+2 semanas)', 'Implantação enxuta: 2 GTs, 2 treinamentos, Go Live e Handover.', 'express'
where not exists (select 1 from public.onboarding_templates where name = 'Implantação Express (3+2 semanas)');

insert into public.onboarding_template_items (template_id, name, milestone_type, offset_days, sort_order)
select t.id, x.name, x.mtype, x.off, x.ord
from public.onboarding_templates t
cross join (values
  ('Kick off','kickoff',0,1),
  ('1º GT','workteam',7,2),
  ('2º GT','workteam',14,3),
  ('1ª TS','training',21,4),
  ('2ª TS','training',28,5),
  ('Go Live','go_live',35,6),
  ('Handover p/ CS','handover',42,7)
) as x(name, mtype, off, ord)
where t.name = 'Implantação Express (3+2 semanas)'
  and not exists (select 1 from public.onboarding_template_items i where i.template_id = t.id);

notify pgrst, 'reload schema';
