import { NextResponse } from 'next/server'
import { verifyHelpDeskRequest } from '@/lib/integrations/helpdesk/auth'
import { getValidAccessToken } from '@/lib/integrations/readai/tokens'
import { listMeetings, getMeeting, normalizeApiTranscript } from '@/lib/integrations/readai/client'
import { getReadAiConfig } from '@/lib/integrations/readai/integration-config'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * DIAGNÓSTICO TEMPORÁRIO: compara o que a REST do Read.ai devolve para UMA reunião via
 * o endpoint de LISTA (/v1/meetings?expand[]=transcript) vs o de RECURSO ÚNICO
 * (/v1/meetings/{id}?expand[]=transcript), usando o token do usuário informado.
 * Responde de forma definitiva se a transcrição existe e se a lista a omite.
 * Auth: segredo dos crons (verifyHelpDeskRequest). Remover após o diagnóstico.
 */
export async function GET(request: Request) {
  if (!(await verifyHelpDeskRequest(request))) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }
  const { searchParams } = new URL(request.url)
  const userId = searchParams.get('user_id') ?? ''
  const meetingId = searchParams.get('meeting_id') ?? ''
  if (!userId || !meetingId) return NextResponse.json({ error: 'user_id e meeting_id obrigatórios' }, { status: 400 })

  const cfg = await getReadAiConfig()
  const baseUrl = cfg.api_base_url?.trim() || undefined

  const token = await getValidAccessToken(userId)
  if (!token) return NextResponse.json({ error: 'sem token válido p/ este usuário' }, { status: 400 })

  const describe = (m: any) => ({
    found: true,
    title: m.title ?? null,
    transcriptPresent: m.transcript != null,
    transcriptType: Array.isArray(m.transcript) ? 'array' : typeof m.transcript,
    transcriptKeys: m.transcript && typeof m.transcript === 'object' && !Array.isArray(m.transcript) ? Object.keys(m.transcript) : null,
    normalizedTranscriptLen: (normalizeApiTranscript(m) || '').length,
    summaryLen: ((m.summary as string) || '').length,
    hasActionItems: m.action_items != null,
  })

  // 1) RECURSO ÚNICO
  let single: unknown = null
  let singleErr: string | null = null
  try {
    const m = await getMeeting(token, meetingId, { baseUrl })
    single = m ? describe(m) : { found: false, note: '404/null' }
  } catch (e) {
    singleErr = e instanceof Error ? e.message : 'erro'
  }

  // 2) LISTA (varre algumas páginas até achar a reunião)
  let list: unknown = null
  let listErr: string | null = null
  try {
    let cursor: string | undefined
    let pages = 0
    let hit: any = null
    while (pages < 10) {
      const { meetings, hasMore, nextCursor } = await listMeetings(token, { cursor, limit: 10, baseUrl })
      hit = meetings.find((mm) => mm.id === meetingId)
      if (hit) break
      if (!hasMore || !nextCursor) break
      cursor = nextCursor
      pages++
    }
    list = hit ? describe(hit) : { found: false, note: `não encontrada nas primeiras ${(pages + 1) * 10}` }
  } catch (e) {
    listErr = e instanceof Error ? e.message : 'erro'
  }

  return NextResponse.json({ userId, meetingId, single, singleErr, list, listErr })
}
