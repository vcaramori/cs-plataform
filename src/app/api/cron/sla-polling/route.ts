import { NextResponse } from 'next/server'
import { runSLAPolling } from '../../../lib/support/polling'

export const maxDuration = 300 // Allow up to 5 minutes for cron jobs on Vercel

export async function POST(request: Request) {
  // Check API Secret for internal cron auth
  const authHeader = request.headers.get('x-api-secret')
  if (authHeader !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const result = await runSLAPolling()
    return NextResponse.json({ 
      success: true, 
      ran_at: new Date().toISOString(),
      ...result 
    })
  } catch (error) {
    console.error('[Cron] SLA Polling Error:', error)
    return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 })
  }
}
