import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Scheduled via pg_cron: 0 8 * * *
serve(async (_req) => {
  const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'
  const apiSecret = Deno.env.get('API_SECRET') || ''

  const res = await fetch(`${appUrl}/api/cron/proactive-alerts`, {
    method: 'POST',
    headers: { 'x-api-secret': apiSecret, 'Content-Type': 'application/json' }
  })

  let body = {};
  try {
    body = await res.json()
  } catch(e) {
    console.error('Failed to parse json', e);
  }
  
  console.log('[cron-proactive-alerts]', body)

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status: res.status
  })
})
