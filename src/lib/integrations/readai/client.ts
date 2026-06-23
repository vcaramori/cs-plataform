/**
 * Cliente da Read.ai REST API (https://api.read.ai/v1).
 * Auth: Bearer com o token PESSOAL de cada agente (Read.ai não tem token de workspace).
 *
 * Shape confirmado na doc oficial (API Reference): GET /v1/meetings retorna
 * { data: Meeting[], has_more, ... }, paginação por cursor = id do último item,
 * filtro de data `start_time_ms.gte` (epoch ms) e campos enriquecidos via `expand[]=`
 * (notação de array): summary, action_items, topics, metrics, transcript.
 *
 * NOTA: a URL base/headers exatos do REST devem ser confirmados em recon (o MCP é OAuth;
 * confirma o formato dos dados, não o endpoint). A base é configurável no banco
 * (readai_integration.api_base_url) e passada por parâmetro — NADA em env.
 */

const DEFAULT_BASE = 'https://api.read.ai/v1'

export interface ReadAiParticipant {
  name: string | null
  email: string | null
  invited?: boolean
  attended?: boolean
}
export interface ReadAiMeeting {
  id: string
  start_time_ms?: number
  end_time_ms?: number
  title?: string
  report_url?: string
  platform?: string
  folders?: string[]
  participants?: ReadAiParticipant[]
  owner?: { name?: string; email?: string }
  summary?: string | null
  action_items?: unknown
  topics?: unknown
  transcript?: unknown
  metrics?: { sentiment?: number; read_score?: number } | null
  [k: string]: unknown
}

export class ReadAiAuthError extends Error {}

export interface ListResult {
  meetings: ReadAiMeeting[]
  hasMore: boolean
  nextCursor?: string
}

const DEFAULT_EXPAND = ['summary', 'action_items', 'topics', 'metrics', 'transcript']

interface SpeakerBlock { speaker?: { name?: string } | string; words?: string; text?: string }

/**
 * Normaliza a transcrição (shape variável) para texto legível "Nome: fala".
 * REST API (GET /v1/meetings com expand[]=transcript):
 *   transcript = { speakers[], turns[]{ speaker.name, text }, text } → usa `text` (já
 *   formatado "Nome: fala") ou, na falta, constrói a partir de turns[].
 * Webhook: transcript.speaker_blocks[]/segments[] com { speaker, words }.
 * Também aceita array direto ou string crua.
 * Vazio → null (para nunca sobrescrever uma transcrição boa por uma vazia).
 */
export function normalizeApiTranscript(m: ReadAiMeeting): string | null {
  const t = m.transcript as unknown
  if (!t) return null
  if (typeof t === 'string') return t.trim() || null

  const obj = t as { text?: unknown; turns?: SpeakerBlock[]; speaker_blocks?: SpeakerBlock[]; segments?: SpeakerBlock[] }

  // 1) REST: `text` já traz a transcrição completa formatada.
  if (typeof obj.text === 'string' && obj.text.trim()) return obj.text.trim()

  // 2) Blocos: turns[] (REST) ou speaker_blocks[]/segments[] (webhook) ou array direto.
  const blocks: SpeakerBlock[] = Array.isArray(t)
    ? (t as SpeakerBlock[])
    : (obj.turns ?? obj.speaker_blocks ?? obj.segments ?? [])
  if (!Array.isArray(blocks) || blocks.length === 0) return null

  const lines: string[] = []
  for (const b of blocks) {
    const speaker = typeof b.speaker === 'string' ? b.speaker : b.speaker?.name
    const words = (b.text ?? b.words ?? '').toString().trim()
    if (!words) continue
    lines.push(speaker ? `${speaker}: ${words}` : words)
  }
  return lines.length ? lines.join('\n\n') : null
}

export async function listMeetings(
  token: string,
  opts: { cursor?: string; startDatetimeGte?: string; limit?: number; expand?: string[]; baseUrl?: string } = {}
): Promise<ListResult> {
  const base = (opts.baseUrl?.trim() || DEFAULT_BASE).replace(/\/$/, '')
  const url = new URL(`${base}/meetings`)
  url.searchParams.set('limit', String(opts.limit ?? 10))
  if (opts.cursor) url.searchParams.set('cursor', opts.cursor)
  // Filtro de data da API: `start_time_ms.gte` (epoch ms) — usado no sync incremental.
  if (opts.startDatetimeGte) {
    const gteMs = Date.parse(opts.startDatetimeGte)
    if (Number.isFinite(gteMs)) url.searchParams.set('start_time_ms.gte', String(gteMs))
  }
  // `expand` usa notação de array (expand[]=transcript&expand[]=summary...). Anexado LITERAL
  // ao final — NÃO via searchParams, que percent-encoda os [] e alguns parsers rejeitam.
  const expands = opts.expand ?? DEFAULT_EXPAND
  let finalUrl = url.toString()
  if (expands.length) {
    finalUrl += (finalUrl.includes('?') ? '&' : '?') + expands.map((e) => `expand[]=${encodeURIComponent(e)}`).join('&')
  }

  const res = await fetch(finalUrl, {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })

  if (res.status === 401 || res.status === 403) {
    throw new ReadAiAuthError(`Read.ai token inválido/expirado (HTTP ${res.status}).`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`Read.ai API ${res.status} em /meetings: ${body.slice(0, 300)}`)
  }

  const json = (await res.json()) as { data?: ReadAiMeeting[]; has_more?: boolean }
  const meetings = Array.isArray(json.data) ? json.data : []
  return {
    meetings,
    hasMore: !!json.has_more,
    nextCursor: meetings.length ? meetings[meetings.length - 1].id : undefined,
  }
}

/** Valida um access token fazendo uma chamada mínima. Lança ReadAiAuthError se inválido. */
export async function validateToken(token: string, baseUrl?: string): Promise<boolean> {
  await listMeetings(token, { limit: 1, expand: [], baseUrl })
  return true
}

/** Data (YYYY-MM-DD) da reunião a partir do epoch ms (ou hoje). */
export function meetingDateISO(ms?: number): string {
  const d = ms ? new Date(ms) : new Date()
  return d.toISOString().slice(0, 10)
}

/** Duração da reunião em horas (de start/end ms); fallback 1.0h. */
export function durationHours(m: ReadAiMeeting): number {
  if (m.start_time_ms && m.end_time_ms && m.end_time_ms > m.start_time_ms) {
    const h = Math.round(((m.end_time_ms - m.start_time_ms) / 3_600_000) * 100) / 100
    // Timestamps ruins geram durações absurdas que ESTOURAM numeric(5,2) (máx 999.99) e
    // distorceriam o esforço; acima de 24h trata como não-confiável e cai no default.
    return h > 24 ? 1.0 : h
  }
  return 1.0
}

/** Extrai action items (shape variável) para {title, description?}. */
export function extractActionItems(m: ReadAiMeeting): Array<{ title: string; description?: string | null }> {
  const raw = m.action_items as unknown
  if (!Array.isArray(raw)) return []
  const out: Array<{ title: string; description?: string | null }> = []
  for (const it of raw) {
    if (typeof it === 'string') { const t = it.trim(); if (t) out.push({ title: t.slice(0, 200) }) }
    else if (it && typeof it === 'object') {
      const o = it as Record<string, unknown>
      const title = (o.text ?? o.title ?? o.action ?? '').toString().trim()
      if (title) out.push({ title: title.slice(0, 200), description: (o.description ?? null) as string | null })
    }
  }
  return out
}
