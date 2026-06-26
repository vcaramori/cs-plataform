import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/voc/action/false-positive — marca um sinal de VoC como falso-positivo de sentimento.
 * Grava em `risk_curation_feedback` (source='voc'), e o `buildVocSignals` passa a EXCLUIR o sinal
 * (mesma curadoria que o RAG já respeita para não reapresentar como risco).
 * Body: { account_id, signal_id, source, source_id, reason? }
 *   - signal_id = id completo do VocSignal (ex.: "interaction:uuid") → vira risk_key (match exato).
 */
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const accountId = body?.account_id ? String(body.account_id) : null
    const signalId = body?.signal_id ? String(body.signal_id) : null
    const sourceId = body?.source_id ? String(body.source_id) : null
    const reason = String(body?.reason ?? '').trim().slice(0, 500) || 'Marcado como falso-positivo de sentimento pelo CSM.'
    if (!accountId || !signalId) {
      return NextResponse.json({ error: 'account_id e signal_id são obrigatórios' }, { status: 400 })
    }

    // Idempotente: não duplica a curadoria do mesmo sinal.
    const { data: existing } = await (supabase as any)
      .from('risk_curation_feedback')
      .select('id')
      .eq('source', 'voc')
      .eq('risk_key', signalId)
      .limit(1)
    if (existing && existing.length > 0) {
      return NextResponse.json({ id: existing[0].id, already: true })
    }

    const { data, error } = await (supabase as any)
      .from('risk_curation_feedback')
      .insert({
        account_id: accountId,
        source: 'voc',
        source_id: sourceId,
        risk_key: signalId,
        decision: 'false_positive',
        reason,
        curator_id: user.id,
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: (data as any).id })
  } catch (error) {
    console.error('[voc/action/false-positive] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
