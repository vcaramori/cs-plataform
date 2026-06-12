import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { extractSignals } from '@/lib/signals/extract-signals'

/**
 * POST /api/wishlist/backfill
 * Varre tickets de suporte (e, opcionalmente, NPS detratores) ainda sem sinais de Wishlist
 * e roda a extração por IA. Idempotente: pula origens que já possuem sinais.
 * Body: { source?: 'support_ticket' | 'nps_response', limit?: number }
 */
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json().catch(() => ({}))
  const source: 'support_ticket' | 'nps_response' = body?.source === 'nps_response' ? 'nps_response' : 'support_ticket'
  const limit = Math.min(Math.max(Number(body?.limit ?? 20), 1), 50)

  const db = getSupabaseAdminClient() as any

  // Origens já processadas (têm sinais)
  const { data: existing } = await db
    .from('wishlist_signals')
    .select('source_id')
    .eq('source_type', source)
    .not('source_id', 'is', null)
  const done = new Set((existing ?? []).map((r: any) => r.source_id))

  let processed = 0
  let created = 0
  let scanned = 0

  if (source === 'support_ticket') {
    const { data: tickets } = await db
      .from('support_tickets')
      .select('id, account_id, title, description, thread_content, created_at')
      .order('created_at', { ascending: false })
      .limit(150)
    for (const t of tickets ?? []) {
      if (processed >= limit) break
      scanned++
      if (done.has(t.id) || !t.account_id) continue
      const text = [t.title, t.description, t.thread_content].filter(Boolean).join('\n\n')
      const n = await extractSignals({
        text,
        accountId: t.account_id,
        sourceType: 'support_ticket',
        sourceId: t.id,
        contextHint: 'Ticket de suporte.',
      })
      processed++
      created += n.wishlist + n.opportunities
    }
  } else {
    const { data: rows } = await db
      .from('nps_responses')
      .select('id, account_id, comment, score')
      .lte('score', 6)
      .not('comment', 'is', null)
      .eq('is_test', false)
      .order('created_at', { ascending: false })
      .limit(150)
    for (const r of rows ?? []) {
      if (processed >= limit) break
      scanned++
      if (done.has(r.id) || !r.account_id) continue
      const n = await extractSignals({
        text: r.comment,
        accountId: r.account_id,
        sourceType: 'nps_response',
        sourceId: r.id,
        contextHint: `Comentário de detrator de NPS (nota ${r.score}).`,
      })
      processed++
      created += n.wishlist + n.opportunities
    }
  }

  return NextResponse.json({ source, scanned, processed, signals_created: created })
}
