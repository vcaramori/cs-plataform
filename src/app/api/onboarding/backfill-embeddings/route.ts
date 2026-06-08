import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { ingestOnboardingEvent } from '@/lib/rag/rag-pipeline'

// Indexa retroativamente os eventos de onboarding ainda não embeddados (trilha RAG 'onboarding').
export async function POST() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient() as any
    const scope = await getUserAccessScope(user.id, 'onboarding')

    let query = (supabase as any)
      .from('onboarding_events')
      .select('id, accounts!inner(csm_owner_id)')
    if (scope !== 'global') query = query.eq('accounts.csm_owner_id', user.id)
    const { data: events, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!events || events.length === 0) {
      return NextResponse.json({ processed: 0, skipped: 0, failed: 0, total: 0 })
    }

    const { data: existing } = await admin
      .from('embeddings')
      .select('source_id')
      .eq('source_type', 'onboarding')
      .in('source_id', events.map((e: any) => e.id))
    const existingIds = new Set((existing ?? []).map((e: any) => e.source_id))
    const toProcess = events.filter((e: any) => !existingIds.has(e.id))

    let processed = 0
    let failed = 0
    for (const e of toProcess) {
      const ok = await ingestOnboardingEvent(e.id)
      if (ok) processed++
      else failed++
    }

    return NextResponse.json({ processed, skipped: existingIds.size, failed, total: events.length })
  } catch (err: any) {
    console.error('[Onboarding Backfill] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
