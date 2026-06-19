-- Agenda HelpDesk + Read.ai via Supabase (pg_cron + pg_net), substituindo o GitHub Actions.
-- O segredo (x-api-secret) e a URL base vêm do app_settings — tudo no banco, zero env/GitHub.
-- O endpoint na Vercel valida o x-api-secret (verifyHelpDeskRequest → app_settings.helpdesk_integration.secret).

create or replace function public.trigger_vercel_cron(path text)
returns bigint
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_secret text;
  v_base   text;
  v_req_id bigint;
begin
  select value->>'secret'   into v_secret from public.app_settings where key = 'helpdesk_integration';
  select value->>'base_url' into v_base   from public.app_settings where key = 'cron_config';
  if v_secret is null or v_base is null then
    raise warning 'trigger_vercel_cron: secret/base_url ausente em app_settings';
    return null;
  end if;
  select net.http_post(
    url     := v_base || path,
    headers := jsonb_build_object('Content-Type', 'application/json', 'x-api-secret', v_secret),
    body    := '{}'::jsonb,
    timeout_milliseconds := 120000
  ) into v_req_id;
  return v_req_id;
end;
$$;

revoke all on function public.trigger_vercel_cron(text) from public;

-- Agendamentos horários (idempotente por nome). Defasados para não competirem.
select cron.schedule('helpdesk-sync-hourly', '0 * * * *',  $$ select public.trigger_vercel_cron('/api/cron/helpdesk-sync') $$);
select cron.schedule('readai-sync-hourly',   '15 * * * *', $$ select public.trigger_vercel_cron('/api/cron/readai-sync') $$);
