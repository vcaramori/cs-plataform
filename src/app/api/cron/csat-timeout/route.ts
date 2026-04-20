import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'

const TIMEOUT_DAYS = parseInt(process.env.SUPPORT_CSAT_TIMEOUT_DAYS || '5')

export async function POST(request: Request) {
  const secret = request.headers.get('x-api-secret')
  if (secret !== process.env.API_SECRET) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const supabase = createAdminClient()
  const cutoff = new Date()
  cutoff.setDate(cutoff.getDate() - TIMEOUT_DAYS)

  // Find tickets resolved before cutoff with no CSAT response and valid (unused) tokens
  const { data: expiredTokens } = await supabase
    .from('csat_tokens')
    .select('ticket_id, token')
    .is('used_at', null)
    .lt('expires_at', new Date().toISOString())

  const expired = expiredTokens?.length ?? 0

  console.log(`[CSAT Timeout] ${expired} tokens expired without response as of ${new Date().toISOString()}`)

  return NextResponse.json({ expired, ran_at: new Date().toISOString() })
}
