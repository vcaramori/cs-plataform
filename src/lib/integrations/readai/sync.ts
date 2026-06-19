import { randomUUID } from 'crypto'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { listMeetings, ReadAiAuthError, meetingDateISO, type ReadAiMeeting } from './client'
import { getValidAccessToken, listConnectedUserIds } from './tokens'
import { ingestReadAiMeeting } from './ingest'
import { getReadAiConfig } from './integration-config'
import { logReadAiImport, pruneImportLog, type ImportSource } from './import-log'
import { buildAccountIndex, resolveAccountId, type AccountIndex, type NormalizedTicket } from '@/lib/integrations/helpdesk/map'
import { getIntegrationConfig } from '@/lib/integrations/helpdesk/auth'

/**
 * Sincroniza reuniões do Read.ai → interactions (transcrição completa) + time_entries
 * (esforço) + RAG, vinculando à conta pelo domínio dos participantes externos / título.
 * Cada reunião é registrada em readai_import_log (created/updated/merged/skipped/error/
 * possible_duplicate) para diagnóstico no admin.
 */

const STATE_KEY = 'readai_sync_state'
const MAX_PAGES_PER_USER = 60 // 60*10 = 600 reuniões por ciclo (backfill em vários ciclos)

interface UserState { historical_done?: boolean; last_sync_at?: string }
type SyncState = Record<string, UserState>

export interface ReadAiSyncResult {
  users: number
  created: number
  updated: number
  merged: number
  possibleDuplicates: number
  skipped: number
  errors: string[]
}

const emptyResult = (): ReadAiSyncResult => ({ users: 0, created: 0, updated: 0, merged: 0, possibleDuplicates: 0, skipped: 0, errors: [] })

export async function loadAccountIndex(): Promise<AccountIndex> {
  const admin = getSupabaseAdminClient()
  const [{ data: accounts }, { data: contracts }, cfg] = await Promise.all([
    (admin.from('accounts') as any).select('id, name, client_id, website, helpdesk_tags'),
    admin.from('contracts').select('account_id, instance_url'),
    getIntegrationConfig(),
  ])
  return buildAccountIndex(accounts ?? [], contracts ?? [], { code_map: cfg.code_map, domain_map: cfg.domain_map })
}

async function readState(): Promise<SyncState> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin.from('app_settings').select('value').eq('key', STATE_KEY).maybeSingle()
  return ((data?.value as SyncState) ?? {}) as SyncState
}
async function writeState(state: SyncState): Promise<void> {
  const admin = getSupabaseAdminClient()
  await admin.from('app_settings').upsert(
    { key: STATE_KEY, value: state as unknown as never, description: 'Estado de sync Read.ai por usuário', updated_at: new Date().toISOString() },
    { onConflict: 'key' }
  )
}

/** Resolve a conta da reunião: tenta cada participante externo + o título. */
export function resolveMeetingAccount(m: ReadAiMeeting, idx: AccountIndex): string | null {
  const title = (m.title ?? '').toString()
  const emails = (m.participants ?? [])
    .map((p) => p.email?.toLowerCase())
    .filter((e): e is string => !!e && e.includes('@'))
  for (const email of emails) {
    const t = { subject: title, requesterEmail: email } as unknown as NormalizedTicket
    const id = resolveAccountId(t, idx)
    if (id) return id
  }
  const tTitle = { subject: title, requesterEmail: null } as unknown as NormalizedTicket
  return resolveAccountId(tTitle, idx)
}

interface SyncCtx { runId: string; source: ImportSource }

async function syncUser(
  userId: string,
  idx: AccountIndex,
  state: SyncState,
  res: ReadAiSyncResult,
  fallbackAccountId: string | null,
  apiBaseUrl: string | undefined,
  ctx: SyncCtx
) {
  const token = await getValidAccessToken(userId)
  if (!token) throw new ReadAiAuthError('Sem token válido — reconectar')

  const us = state[userId] ?? {}
  const startedAt = new Date().toISOString()
  const startGte = us.historical_done ? us.last_sync_at : undefined

  let cursor: string | undefined
  let pages = 0
  do {
    const { meetings, hasMore, nextCursor } = await listMeetings(token, { cursor, startDatetimeGte: startGte, limit: 10, baseUrl: apiBaseUrl })
    for (const m of meetings) {
      if (!m.id) { res.skipped++; continue }
      const meetingDate = meetingDateISO(m.start_time_ms)
      const accountId = resolveMeetingAccount(m, idx) ?? fallbackAccountId
      if (!accountId) {
        res.skipped++
        await logReadAiImport({ runId: ctx.runId, userId, source: ctx.source, externalMeetingId: m.id, title: m.title ?? null, meetingDate, action: 'skipped', detail: 'sem conta resolvida (reunião interna/sem cliente)' })
        continue
      }
      try {
        const r = await ingestReadAiMeeting(m, accountId, userId)
        if (r.action === 'created') res.created++
        else if (r.action === 'updated') res.updated++
        else if (r.action === 'merged') res.merged++
        else if (r.action === 'possible_duplicate') res.possibleDuplicates++
        else res.skipped++
        await logReadAiImport({ runId: ctx.runId, userId, source: ctx.source, externalMeetingId: r.externalMeetingId, accountId: r.accountId, title: r.title, meetingDate, action: r.action, detail: r.detail ?? null })
      } catch (e) {
        const msg = e instanceof Error ? e.message : 'erro'
        res.errors.push(`${m.id}: ${msg}`)
        await logReadAiImport({ runId: ctx.runId, userId, source: ctx.source, externalMeetingId: m.id, title: m.title ?? null, meetingDate, action: 'error', detail: msg })
      }
    }
    cursor = hasMore ? nextCursor : undefined
    pages++
  } while (cursor && pages < MAX_PAGES_PER_USER)

  // historical_done só quando esgotou as páginas (não parou por limite).
  state[userId] = { historical_done: pages < MAX_PAGES_PER_USER ? true : us.historical_done, last_sync_at: startedAt }
}

/** Loga o erro de auth de forma acionável (caso clássico: audience da REST API). */
async function logAuthError(ctx: SyncCtx, userId: string) {
  await logReadAiImport({
    runId: ctx.runId, userId, source: ctx.source, action: 'error',
    detail: 'Token recusado pela API do Read.ai (HTTP 401/403). Reconecte o Read.ai ou defina o "OAuth audience" em Configurações → Read.ai → Avançado.',
  })
}

/** Sincroniza TODOS os CSMs conectados (incremental) — usado pelo cron. */
export async function runReadAiSync(): Promise<ReadAiSyncResult> {
  const res = emptyResult()
  const [idx, userIds, state, cfg] = await Promise.all([
    loadAccountIndex(),
    listConnectedUserIds(),
    readState(),
    getReadAiConfig(),
  ])
  const fallbackAccountId = cfg.store_unmatched && cfg.fallback_account_id ? cfg.fallback_account_id : null
  const apiBaseUrl = cfg.api_base_url?.trim() || undefined
  const ctx: SyncCtx = { runId: randomUUID(), source: 'cron' }

  for (const userId of userIds) {
    res.users++
    try {
      await syncUser(userId, idx, state, res, fallbackAccountId, apiBaseUrl, ctx)
    } catch (e) {
      if (e instanceof ReadAiAuthError) { res.errors.push(`Usuário ${userId}: token inválido — reconectar`); await logAuthError(ctx, userId) }
      else res.errors.push(`Usuário ${userId}: ${e instanceof Error ? e.message : 'erro'}`)
    }
  }

  await writeState(state)
  await pruneImportLog()
  res.errors = res.errors.slice(0, 50)
  return res
}

/**
 * Sincroniza UM CSM. Usado ao conectar (histórico completo) e pelo botão self-service.
 * force=true zera o estado do usuário → backfill completo do histórico.
 */
export async function runReadAiSyncForUser(
  userId: string,
  opts: { source: ImportSource; force?: boolean }
): Promise<ReadAiSyncResult> {
  const res = emptyResult()
  const [idx, state, cfg] = await Promise.all([loadAccountIndex(), readState(), getReadAiConfig()])
  const fallbackAccountId = cfg.store_unmatched && cfg.fallback_account_id ? cfg.fallback_account_id : null
  const apiBaseUrl = cfg.api_base_url?.trim() || undefined
  const ctx: SyncCtx = { runId: randomUUID(), source: opts.source }

  if (opts.force) state[userId] = { historical_done: false, last_sync_at: undefined }

  res.users = 1
  try {
    await syncUser(userId, idx, state, res, fallbackAccountId, apiBaseUrl, ctx)
  } catch (e) {
    if (e instanceof ReadAiAuthError) { res.errors.push('Token inválido/recusado — reconectar ou verificar audience'); await logAuthError(ctx, userId) }
    else res.errors.push(e instanceof Error ? e.message : 'erro')
  }

  await writeState(state)
  await pruneImportLog()
  res.errors = res.errors.slice(0, 50)
  return res
}
