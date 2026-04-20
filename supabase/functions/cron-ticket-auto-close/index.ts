import { serve } from 'https://deno.land/std@0.177.0/http/server.ts'

// Scheduled via pg_cron: */15 * * * *
serve(async (_req) => {
  const appUrl = Deno.env.get('NEXT_PUBLIC_APP_URL') || 'http://localhost:3000'
  const apiSecret = Deno.env.get('API_SECRET') || ''

  const res = await fetch(`${appUrl}/api/cron/ticket-auto-close`, {
    method: 'POST',
    headers: { 'x-api-secret': apiSecret, 'Content-Type': 'application/json' }
  })

  const body = await res.json()
  console.log('[cron-ticket-auto-close]', body)

  return new Response(JSON.stringify(body), {
    headers: { 'Content-Type': 'application/json' },
    status: res.status
  })
})
