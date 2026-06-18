import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { listMeetings, ReadAiAuthError, type ReadAiMeeting } from './client'
import { getValidAccessToken, listConnectedUserIds } from './tokens'
import { ingestReadAiMeeting } from './ingest'
import { getReadAiConfig } from './integration-config'
import { buildAccountIndex, resolveAccountId, type AccountIndex, type NormalizedTicket } from '@/lib/integrations/helpdesk/map'
import { getIntegrationConfig } from '@/lib/integrations/helpdesk/auth'

/**
 * Sincroniza reuniões do Read.ai → interactions (transcrição completa) + time_entries
 * (esforço) + RAG, vinculando à conta pelo domínio dos participantes externos / título.
 * Acesso por OAuth (token renovado de forma transparente por CSM). Reusa a resolução
 * de conta do HelpDesk (website/tags/nome).
 */

const STATE_KEY = 'readai_sync_state'
const MAX_PAGES_PER_USER = 60 // 60*10 = 600 reuniões por ciclo (backfill em vários ciclos)

interface UserState { historical_done?: boolean; last_sync_at?: string }
type SyncState = Record<string, UserState>

export interface ReadAiSyncResult {
  users: number
  created: number
  updated: number
  skipped: number
  errors: string[]
}

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

async function syncUser(
  userId: string,
  idx: AccountIndex,
  state: SyncState,
  res: ReadAiSyncResult,
  fallbackAccountId: string | null,
  apiBaseUrl?: string
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
      const accountId = resolveMeetingAccount(m, idx) ?? fallbackAccountId
      if (!accountId) { res.skipped++; continue } // reunião interna/sem cliente
      try {
        const r = await ingestReadAiMeeting(m, accountId, userId)
        if (r === 'created') res.created++
        else if (r === 'updated') res.updated++
        else res.skipped++
      } catch (e) {
        res.errors.push(`${m.id}: ${e instanceof Error ? e.message : 'erro'}`)
      }
    }
    cursor = hasMore ? nextCursor : undefined
    pages++
  } while (cursor && pages < MAX_PAGES_PER_USER)

  // historical_done só quando esgotou as páginas (não parou por limite).
  state[userId] = { historical_done: pages < MAX_PAGES_PER_USER ? true : us.historical_done, last_sync_at: startedAt }
}

export async function runReadAiSync(): Promise<ReadAiSyncResult> {
  const res: ReadAiSyncResult = { users: 0, created: 0, updated: 0, skipped: 0, errors: [] }
  const [idx, userIds, state, cfg] = await Promise.all([
    loadAccountIndex(),
    listConnectedUserIds(),
    readState(),
    getReadAiConfig(),
  ])
  const fallbackAccountId = cfg.store_unmatched && cfg.fallback_account_id ? cfg.fallback_account_id : null
  const apiBaseUrl = cfg.api_base_url?.trim() || undefined

  for (const userId of userIds) {
    res.users++
    try {
      await syncUser(userId, idx, state, res, fallbackAccountId, apiBaseUrl)
    } catch (e) {
      if (e instanceof ReadAiAuthError) res.errors.push(`Usuário ${userId}: token inválido — reconectar`)
      else res.errors.push(`Usuário ${userId}: ${e instanceof Error ? e.message : 'erro'}`)
    }
  }

  await writeState(state)
  res.errors = res.errors.slice(0, 50)
  return res
}
