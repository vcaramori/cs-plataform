-- Modelo de visibilidade (2026-06-03): todo usuário INTERNO tem visão geral de leitura.
-- A restrição por CSM responsável vive apenas na tela Home (filtro próprio na app).
-- Escrita (INSERT/UPDATE/DELETE) e portal externo (service-role) permanecem inalterados.

-- Helper: usuário interno (não-portal). SECURITY DEFINER evita recursão de RLS em profiles.
create or replace function public.is_internal_user()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from profiles p
    where p.id = auth.uid()
      and coalesce(p.user_type, 'internal') <> 'external'
  )
$$;

-- Policy permissiva de SELECT (soma por OR com as policies de dono já existentes).
-- accounts
drop policy if exists accounts_internal_view_all on public.accounts;
create policy accounts_internal_view_all on public.accounts for select using (public.is_internal_user());
-- contacts
drop policy if exists contacts_internal_view_all on public.contacts;
create policy contacts_internal_view_all on public.contacts for select using (public.is_internal_user());
-- contracts
drop policy if exists contracts_internal_view_all on public.contracts;
create policy contracts_internal_view_all on public.contracts for select using (public.is_internal_user());
-- interactions
drop policy if exists interactions_internal_view_all on public.interactions;
create policy interactions_internal_view_all on public.interactions for select using (public.is_internal_user());
-- time_entries
drop policy if exists time_entries_internal_view_all on public.time_entries;
create policy time_entries_internal_view_all on public.time_entries for select using (public.is_internal_user());
-- csm_tasks
drop policy if exists csm_tasks_internal_view_all on public.csm_tasks;
create policy csm_tasks_internal_view_all on public.csm_tasks for select using (public.is_internal_user());
-- success_plans
drop policy if exists success_plans_internal_view_all on public.success_plans;
create policy success_plans_internal_view_all on public.success_plans for select using (public.is_internal_user());
-- proactive_alerts
drop policy if exists proactive_alerts_internal_view_all on public.proactive_alerts;
create policy proactive_alerts_internal_view_all on public.proactive_alerts for select using (public.is_internal_user());
-- nps_programs
drop policy if exists nps_programs_internal_view_all on public.nps_programs;
create policy nps_programs_internal_view_all on public.nps_programs for select using (public.is_internal_user());
-- nps_responses
drop policy if exists nps_responses_internal_view_all on public.nps_responses;
create policy nps_responses_internal_view_all on public.nps_responses for select using (public.is_internal_user());

notify pgrst, 'reload schema';
