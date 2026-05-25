const fs = require('fs');
const path = require('path');

const functions = [
  { name: 'cron-adoption-analysis', route: '/api/cron/adoption-analysis', schedule: '0 2 1,15 * *' },
  { name: 'cron-alert-analysis', route: '/api/cron/alert-analysis', schedule: '0 5 * * 1' },
  { name: 'cron-analyze-ticket-sentiments', route: '/api/cron/analyze-ticket-sentiments', schedule: '0 6 * * *' },
  { name: 'cron-auto-assign-tickets', route: '/api/cron/auto-assign-tickets', schedule: '*/5 * * * *' },
  { name: 'cron-auto-checkin-generate', route: '/api/cron/auto-checkin/generate', schedule: '0 3 * * *' },
  { name: 'cron-auto-checkin-send', route: '/api/cron/auto-checkin/send', schedule: '0 9 * * *' },
  { name: 'cron-cs-ops-daily', route: '/api/cron/cs-ops-daily', schedule: '0 7 * * *' },
  { name: 'cron-escalate-sla-violations', route: '/api/cron/escalate-sla-violations', schedule: '0 * * * *' },
  { name: 'cron-health-score-daily', route: '/api/cron/health-score-daily', schedule: '0 4 * * *' },
  { name: 'cron-proactive-alerts', route: '/api/cron/proactive-alerts', schedule: '0 8 * * *' }
];

const basePath = path.join(__dirname, 'supabase', 'functions');

functions.forEach(fn => {
  const dirPath = path.join(basePath, fn.name);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }

  const content = `import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Scheduled via pg_cron: ${fn.schedule}
serve(async (_req) => {
  const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'
  const apiSecret = Deno.env.get('API_SECRET') || ''

  const res = await fetch(\`\${appUrl}${fn.route}\`, {
    method: 'POST',
    headers: { 'x-api-secret': apiSecret, 'Content-Type': 'application/json' }
  })

  let body = {};
  try {
    body = await res.json()
  } catch(e) {
    console.error('Failed to parse json', e);
  }
  
  console.log('[${fn.name}]', body)

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status: res.status
  })
})
`;

  fs.writeFileSync(path.join(dirPath, 'index.ts'), content);
});

console.log('Created edge functions!');
