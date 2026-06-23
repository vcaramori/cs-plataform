import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'
import { getValidAccessToken } from '@/lib/integrations/readai/tokens'
import { getMeeting, normalizeApiTranscript } from '@/lib/integrations/readai/client'
import { getReadAiConfig } from '@/lib/integrations/readai/integration-config'
import { loadAccountIndex, resolveMeetingAccount } from '@/lib/integrations/readai/sync'
import { ingestReadAiMeeting } from '@/lib/integrations/readai/ingest'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

export const dynamic = 'force-dynamic'
export const maxDuration = 120

/**
 * DIAGNÓSTICO/BACKFILL DIRIGIDO (temporário). Busca UMA reunião pelo RECURSO ÚNICO
 * (/v1/meetings/{id}?expand[]=transcript) via o token do usuário informado — que devolve a
 * transcrição de forma confiável — e, com ingest=1, INGERE (salva transcrição/resumo).
 * Contorna a varredura de lista (lenta/cursor/timeout). Auth: segredo dos crons.
 */
export async function GET(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id') ?? ''
  const meetingId = searchParams.get('meeting_id') ?? ''
  const doIngest = searchParams.get('ingest') === '1'
  if (!userId || !meetingId) return NextResponse.json({ error: 'user_id e meeting_id obrigatórios' }, { status: 400 })

  const cfg = await getReadAiConfig()
  const baseUrl = cfg.api_base_url?.trim() || undefined

  const token = await getValidAccessToken(userId)
  if (!token) return NextResponse.json({ error: 'sem token válido p/ este usuário' }, { status: 400 })

  let m: any = null
  let fetchErr: string | null = null
  try {
    m = await getMeeting(token, meetingId, { baseUrl })
  } catch (e) {
    fetchErr = e instanceof Error ? e.message : 'erro'
  }
  if (!m) return NextResponse.json({ meetingId, fetched: false, fetchErr })

  const api = {
    title: m.title ?? null,
    transcriptPresent: m.transcript != null,
    normalizedTranscriptLen: (normalizeApiTranscript(m) || '').length,
    summaryLen: ((m.summary as string) || '').length,
  }

  let ingest: unknown = null
  let savedTranscriptLen: number | null = null
  if (doIngest) {
    const idx = await loadAccountIndex()
    const fallbackAccountId = cfg.store_unmatched && cfg.fallback_account_id ? cfg.fallback_account_id : null
    const accountId = resolveMeetingAccount(m, idx) ?? fallbackAccountId
    if (!accountId) {
      ingest = { skipped: true, reason: 'sem conta resolvida' }
    } else {
      try {
        const outcome = await ingestReadAiMeeting(m, accountId, userId, { extractSignals: false })
        ingest = outcome
        const admin = getSupabaseAdminClient() as any
        const { data } = await admin.from('interactions').select('raw_transcript').eq('external_meeting_id', meetingId).maybeSingle()
        savedTranscriptLen = data?.raw_transcript ? (data.raw_transcript as string).length : 0
      } catch (e) {
        ingest = { error: e instanceof Error ? e.message : 'erro' }
      }
    }
  }

  return NextResponse.json({ userId, meetingId, fetched: true, api, ingest, savedTranscriptLen })
}
