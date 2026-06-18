import { createHmac, timingSafeEqual } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import type { ReadAiMeeting, ReadAiParticipant } from './client'

/**
 * Webhooks nativos do Read.ai (PUSH) — o equivalente estável e oficial do que a Zapier
 * faz por baixo dos panos. Quando um relatório de reunião fica pronto, o Read.ai faz
 * POST do payload completo (resumo, action items, transcrição, participantes) para a
 * nossa URL. SEM OAuth, SEM token expirando, SEM polling.
 *
 * Doc: https://support.read.ai/.../Getting-Started-with-Webhooks
 *  - Header de assinatura: X-Read-Signature = HMAC-SHA256(raw_body) com a signing key
 *    em base64 (decodificada antes de assinar). Comparação em hex.
 *  - request_id: id único por entrega (dedup/replay). Dedup real aqui é por session_id
 *    (= external_meeting_id), que a ingestão já trata como upsert.
 *  - trigger: 'meeting_end' (relatório pronto) | 'meeting_start' (só workspace; sem dados).
 */

export interface WebhookParticipant {
  name?: string | null
  first_name?: string | null
  last_name?: string | null
  email?: string | null
}

export interface ReadAiWebhookPayload {
  session_id: string
  trigger: 'meeting_end' | 'meeting_start' | string
  title?: string
  start_time?: string // ISO UTC
  end_time?: string // ISO UTC
  participants?: WebhookParticipant[]
  owner?: WebhookParticipant | null
  summary?: string | null
  action_items?: Array<{ text?: string } | string>
  key_questions?: Array<{ text?: string }>
  topics?: Array<{ text?: string }>
  report_url?: string
  chapter_summaries?: unknown
  transcript?: unknown
  platform_meeting_id?: string
  platform?: string
  request_id?: string
}

/**
 * Verifica a assinatura HMAC-SHA256 do webhook (X-Read-Signature).
 * A signing key vem em base64 e é decodificada antes de assinar o corpo CRU.
 * Retorna true se QUALQUER uma das chaves configuradas casar (suporta rotação).
 */
export function verifyReadAiSignature(rawBody: string, headerSig: string | null, signingKeys: string[]): boolean {
  if (!headerSig || signingKeys.length === 0) return false
  const expected = Buffer.from(headerSig.toLowerCase(), 'utf8')
  for (const keyB64 of signingKeys) {
    try {
      const keyBytes = Buffer.from(keyB64, 'base64')
      if (keyBytes.length === 0) continue
      const digest = createHmac('sha256', keyBytes).update(rawBody, 'utf8').digest('hex')
      const got = Buffer.from(digest, 'utf8')
      if (got.length === expected.length && timingSafeEqual(got, expected)) return true
    } catch {
      // chave malformada — tenta a próxima
    }
  }
  return false
}

const isoToMs = (iso?: string): number | undefined => {
  if (!iso) return undefined
  const ms = Date.parse(iso)
  return Number.isFinite(ms) ? ms : undefined
}

/** Adapta o payload do webhook para o shape ReadAiMeeting já consumido por ingestReadAiMeeting. */
export function webhookPayloadToMeeting(p: ReadAiWebhookPayload): ReadAiMeeting {
  const participants: ReadAiParticipant[] = (p.participants ?? []).map((pt) => ({
    name: pt.name ?? null,
    email: pt.email ?? null,
  }))
  return {
    id: p.session_id,
    start_time_ms: isoToMs(p.start_time),
    end_time_ms: isoToMs(p.end_time),
    title: p.title,
    report_url: p.report_url,
    platform: p.platform,
    participants,
    owner: p.owner ? { name: p.owner.name ?? undefined, email: p.owner.email ?? undefined } : undefined,
    summary: p.summary ?? null,
    action_items: p.action_items ?? null,
    topics: p.topics ?? null,
    transcript: p.transcript ?? null,
    metrics: null, // o webhook não traz sentiment/read_score
  }
}

/**
 * Resolve o CSM (auth.users.id) dono da reunião pelo email do owner do webhook.
 * profiles não guarda email — usamos o admin client para varrer auth.users.
 * Retorna null se não casar (o chamador aplica o default_csm_id).
 */
export async function resolveCsmIdByEmail(email?: string | null): Promise<string | null> {
  if (!email) return null
  const target = email.trim().toLowerCase()
  if (!target.includes('@')) return null
  const admin = getSupabaseAdminClient() as any
  try {
    // Times de CS são pequenos; uma página (até 200) cobre com folga.
    const { data, error } = await admin.auth.admin.listUsers({ page: 1, perPage: 200 })
    if (error) return null
    const users: Array<{ id: string; email?: string | null }> = data?.users ?? []
    const hit = users.find((u) => (u.email ?? '').toLowerCase() === target)
    return hit?.id ?? null
  } catch {
    return null
  }
}
