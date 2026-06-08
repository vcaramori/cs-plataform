import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { ingestNegotiation } from '@/lib/rag/rag-pipeline'

// Indexa retroativamente o histórico de negociação ainda não embeddado (trilha RAG 'negotiation').
export async function POST() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  try {
    const admin = getSupabaseAdminClient() as any
    const scope = await getUserAccessScope(user.id, 'contracts')

    let query = (supabase as any)
      .from('contract_negotiation_history')
      .select('id, accounts!inner(csm_owner_id)')
    if (scope !== 'global') query = query.eq('accounts.csm_owner_id', user.id)
    const { data: rows, error } = await query
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    if (!rows || rows.length === 0) {
      return NextResponse.json({ processed: 0, skipped: 0, failed: 0, total: 0 })
    }

    const { data: existing } = await admin
      .from('embeddings')
      .select('source_id')
      .eq('source_type', 'negotiation')
      .in('source_id', rows.map((r: any) => r.id))
    const existingIds = new Set((existing ?? []).map((e: any) => e.source_id))
    const toProcess = rows.filter((r: any) => !existingIds.has(r.id))

    let processed = 0
    let failed = 0
    for (const r of toProcess) {
      const ok = await ingestNegotiation(r.id)
      if (ok) processed++
      else failed++
    }

    return NextResponse.json({ processed, skipped: existingIds.size, failed, total: rows.length })
  } catch (err: any) {
    console.error('[Negotiation Backfill] Error:', err)
    return NextResponse.json({ error: err.message }, { status: 500 })
  }
}
