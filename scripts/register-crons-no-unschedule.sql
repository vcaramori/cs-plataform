
SELECT cron.schedule('cron-adoption-analysis', '0 2 1,15 * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-adoption-analysis',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron-analyze-ticket-sentiments', '0 6 * * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-analyze-ticket-sentiments',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron-auto-assign-tickets', '*/5 * * * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-auto-assign-tickets',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron-auto-checkin-generate', '0 3 * * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-auto-checkin-generate',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron-auto-checkin-send', '0 9 * * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-auto-checkin-send',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron-cs-ops-daily', '0 7 * * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-cs-ops-daily',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron-escalate-sla-violations', '0 * * * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-escalate-sla-violations',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron-health-score-daily', '0 4 * * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-health-score-daily',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);

SELECT cron.schedule('cron-proactive-alerts', '0 8 * * *', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/cron-proactive-alerts',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
