const fs = require('fs');
const path = require('path');

const functions = [
  { name: 'cron-adoption-analysis', schedule: '0 2 1,15 * *' },
  { name: 'cron-analyze-ticket-sentiments', schedule: '0 6 * * *' },
  { name: 'cron-auto-assign-tickets', schedule: '*/5 * * * *' },
  { name: 'cron-auto-checkin-generate', schedule: '0 3 * * *' },
  { name: 'cron-auto-checkin-send', schedule: '0 9 * * *' },
  { name: 'cron-cs-ops-daily', schedule: '0 7 * * *' },
  { name: 'cron-escalate-sla-violations', schedule: '0 * * * *' },
  { name: 'cron-health-score-daily', schedule: '0 4 * * *' },
  { name: 'cron-proactive-alerts', schedule: '0 8 * * *' }
];

let sql = '';
functions.forEach(fn => {
  sql += `
SELECT cron.schedule('${fn.name}', '${fn.schedule}', $$
  SELECT net.http_post(
    url := 'https://mgkwaejxazwwevblqycd.supabase.co/functions/v1/${fn.name}',
    headers := '{"Content-Type": "application/json", "Authorization": "Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1na3dhZWp4YXp3d2V2YmxxeWNkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzQ2MTMzNDIsImV4cCI6MjA5MDE4OTM0Mn0.1bT4-Z1ElatAmY_vT1LsJS4dobN-Bzsjoj1Wxgpng8I"}'::jsonb,
    body := '{}'::jsonb
  );
$$);
`;
});

fs.writeFileSync(path.join(__dirname, 'register-crons-no-unschedule.sql'), sql);
console.log('SQL generated!');
