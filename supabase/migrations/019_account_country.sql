alter table public.accounts
  add column if not exists country text;

create table if not exists public.commercial_governance (
  id uuid primary key default gen_random_uuid(),
  account_id uuid not null references public.accounts(id) on delete cascade,
  contract_id uuid references public.contracts(id) on delete cascade,
  rule_type text not null check (rule_type in ('discount', 'penalty', 'fidelity')),
  sub_type text not null check (sub_type in ('progressive', 'fixed', 'percentage', 'fidelity_penalty')),
  label text not null,
  value numeric not null default 0,
  config jsonb not null default '{}'::jsonb,
  is_active boolean not null default true,
  starts_at date,
  ends_at date,
  created_at timestamptz not null default now()
);

alter table public.commercial_governance
  add column if not exists starts_at date,
  add column if not exists ends_at date;

alter table public.commercial_governance enable row level security;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'commercial_governance'
      and policyname = 'commercial_governance_select_own_accounts'
  ) then
    create policy commercial_governance_select_own_accounts
      on public.commercial_governance for select
      using (
        exists (
          select 1 from public.accounts
          where accounts.id = commercial_governance.account_id
            and accounts.csm_owner_id = auth.uid()
        )
      );
  end if;
end $$;

do $$
begin
  if not exists (
    select 1 from pg_policies
    where schemaname = 'public'
      and tablename = 'commercial_governance'
      and policyname = 'commercial_governance_mutate_own_accounts'
  ) then
    create policy commercial_governance_mutate_own_accounts
      on public.commercial_governance for all
      using (
        exists (
          select 1 from public.accounts
          where accounts.id = commercial_governance.account_id
            and accounts.csm_owner_id = auth.uid()
        )
      )
      with check (
        exists (
          select 1 from public.accounts
          where accounts.id = commercial_governance.account_id
            and accounts.csm_owner_id = auth.uid()
        )
      );
  end if;
end $$;
