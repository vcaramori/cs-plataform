import { NextResponse } from 'next/server'
import { getReadAiConfig } from '@/lib/integrations/readai/integration-config'
import {
  verifyReadAiSignature,
  webhookPayloadToMeeting,
  resolveCsmIdByEmail,
  type ReadAiWebhookPayload,
} from '@/lib/integrations/readai/webhook'
import { ingestReadAiMeeting } from '@/lib/integrations/readai/ingest'
import { loadAccountIndex, resolveMeetingAccount } from '@/lib/integrations/readai/sync'
import { meetingDateISO, getMeeting } from '@/lib/integrations/readai/client'
import { getValidAccessToken } from '@/lib/integrations/readai/tokens'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { logReadAiImport } from '@/lib/integrations/readai/import-log'

export const dynamic = 'force-dynamic'
export const maxDuration = 60

/**
 * Receptor de Webhooks do Read.ai (PUSH). O Read.ai faz POST do relatório da reunião aqui
 * quando ela termina. Configure a URL desta rota em https://app.read.ai/analytics/integrations/webhooks
 * (webhook de workspace para capturar todo o time) e cole a signing key no admin da plataforma.
 *
 * Autenticidade: HMAC-SHA256 do corpo CRU vs. header X-Read-Signature.
 * Idempotência: a ingestão deduplica por session_id (external_meeting_id) — re-entregas
 * (retry do Read.ai) só atualizam a mesma interaction/time_entry.
 *
 * Convenção de status: 2xx encerra a entrega (Read.ai NÃO repete). Por isso casos de
 * negócio (sem conta/sem CSM/desabilitado) retornam 200 + motivo; só erro inesperado → 500
 * (para o Read.ai tentar de novo, até 6x).
 */
export async function POST(request: Request) {
  const rawBody = await request.text()
  const cfg = await getReadAiConfig()

  // 1) Autenticidade. Se há signing key(s) configurada(s), exige assinatura válida.
  const signingKeys = (cfg.webhook_signing_keys ?? []).filter(Boolean)
  const headerSig = request.headers.get('x-read-signature')
  if (signingKeys.length > 0) {
    if (!verifyReadAiSignature(rawBody, headerSig, signingKeys)) {
      return NextResponse.json({ error: 'invalid_signature' }, { status: 401 })
    }
  } else {
    console.warn('[Read.ai webhook] Sem signing key configurada — aceitando sem verificar (configure no admin).')
  }

  // 2) Parse.
  let payload: ReadAiWebhookPayload
  try {
    payload = JSON.parse(rawBody) as ReadAiWebhookPayload
  } catch {
    return NextResponse.json({ error: 'invalid_json' }, { status: 400 })
  }
  if (!payload?.session_id) {
    return NextResponse.json({ error: 'missing_session_id' }, { status: 400 })
  }

  // meeting_start não traz relatório — apenas confirma o recebimento.
  if (payload.trigger === 'meeting_start') {
    return NextResponse.json({ status: 'ack', trigger: 'meeting_start' })
  }

  if (cfg.enabled === false) {
    return NextResponse.json({ status: 'skipped', reason: 'integration_disabled' })
  }

  const meetingDate = meetingDateISO(payload.start_time ? Date.parse(payload.start_time) : undefined)
  try {
    const meeting = webhookPayloadToMeeting(payload)

    // 3) Conta da reunião (participantes/título) + fallback opcional.
    const idx = await loadAccountIndex()
    const fallbackAccountId = cfg.store_unmatched && cfg.fallback_account_id ? cfg.fallback_account_id : null
    const accountId = resolveMeetingAccount(meeting, idx) ?? fallbackAccountId
    if (!accountId) {
      await logReadAiImport({ source: 'webhook', externalMeetingId: payload.session_id, title: payload.title ?? null, meetingDate, action: 'skipped', detail: 'sem conta resolvida (reunião interna/sem cliente)' })
      return NextResponse.json({ status: 'skipped', reason: 'no_account_match', session_id: payload.session_id })
    }

    // 4) CSM dono (owner.email → auth.users) + fallback configurável.
    const csmId = (await resolveCsmIdByEmail(payload.owner?.email)) ?? cfg.webhook_default_csm_id ?? null
    if (!csmId) {
      await logReadAiImport({ source: 'webhook', accountId, externalMeetingId: payload.session_id, title: payload.title ?? null, meetingDate, action: 'skipped', detail: `CSM não identificado (owner: ${payload.owner?.email ?? '—'}); defina um CSM padrão no admin` })
      return NextResponse.json({ status: 'skipped', reason: 'no_csm_resolved', session_id: payload.session_id })
    }

    const result = await ingestReadAiMeeting(meeting, accountId, csmId)
    await logReadAiImport({ source: 'webhook', userId: csmId, externalMeetingId: result.externalMeetingId, accountId: result.accountId, title: result.title, meetingDate, action: result.action, detail: result.detail ?? null })

    // Fecha o gap do webhook: o payload NÃO traz metrics.sentiment (só o REST/expand traz).
    // Busca leve via REST (apenas expand=metrics) e dá patch no sentiment_score da interação.
    // AWAITED de propósito — trabalho pós-resposta não é confiável na Vercel. Best-effort:
    // se falhar (sem token/erro), o sentimento entra no próximo ciclo do cron readai-sync.
    let sentimentPatched = false
    try {
      const token = await getValidAccessToken(csmId)
      if (token) {
        const full = await getMeeting(token, payload.session_id, { expand: ['metrics'], baseUrl: cfg.api_base_url?.trim() || undefined })
        const s = typeof full?.metrics?.sentiment === 'number' ? full.metrics.sentiment : null
        if (s != null && s >= -1 && s <= 1) {
          const admin = getSupabaseAdminClient() as any
          await admin.from('interactions').update({ sentiment_score: Math.round(s * 1000) / 1000 }).eq('external_meeting_id', payload.session_id)
          sentimentPatched = true
        }
      }
    } catch (e) {
      console.warn('[Read.ai webhook] fetch de métricas falhou (sentimento virá no próximo sync):', e instanceof Error ? e.message : e)
    }
    return NextResponse.json({ status: result.action, session_id: payload.session_id, sentiment_patched: sentimentPatched })
  } catch (e) {
    const message = e instanceof Error ? e.message : 'erro'
    console.error('[Read.ai webhook] Falha ao ingerir:', message)
    await logReadAiImport({ source: 'webhook', externalMeetingId: payload.session_id, title: payload.title ?? null, meetingDate, action: 'error', detail: message })
    return NextResponse.json({ error: message }, { status: 500 })
  }
}

/** Conveniência: GET informa que a rota está viva (Read.ai usa só POST). */
export async function GET() {
  return NextResponse.json({ ok: true, hint: 'Read.ai webhook receiver — use POST' })
}
