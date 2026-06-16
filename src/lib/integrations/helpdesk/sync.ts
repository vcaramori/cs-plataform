import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { env } from '@/lib/env'
import { getBearerToken, listTicketsPage, HelpDeskAuthError } from './client'
import { getIntegrationConfig } from './auth'
import {
  normalizeTicket,
  buildAccountIndex,
  resolveAccountId,
  type NormalizedTicket,
  type AccountIndex,
} from './map'

/**
 * Orquestra a sincronização HelpDesk → support_tickets (+ csat_responses).
 *
 * - 1ª execução (carga histórica): puxa TODOS os solved/closed.
 * - Execuções seguintes (incremental): para de paginar quando encontra um ticket
 *   mais antigo que last_sync_at (lista vem por updatedAt desc).
 * Tudo entra por upsert em external_ticket_id → não duplica, só atualiza.
 * Trata solved→closed (vira closed ~2 dias depois) e rating tardio.
 */

const SYNC_STATE_KEY = 'helpdesk_sync_state'
// Vazio = traz TODOS os status (base equalizada com o HelpDesk), não só solved/closed.
const STATUSES: string[] = []

interface SyncState {
  historical_done: boolean
  last_sync_at: string | null
}

export interface SyncResult {
  mode: 'historical' | 'incremental'
  scanned: number
  created: number
  updated: number
  csat: number
  skipped: number
  pages: number
  tokenExpiresInDays: number | null
  errors: string[]
}

async function readState(): Promise<SyncState> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', SYNC_STATE_KEY)
    .maybeSingle()
  const v = (data?.value ?? {}) as Partial<SyncState>
  return { historical_done: v.historical_done ?? false, last_sync_at: v.last_sync_at ?? null }
}

async function writeState(state: SyncState): Promise<void> {
  const admin = getSupabaseAdminClient()
  await admin.from('app_settings').upsert(
    {
      key: SYNC_STATE_KEY,
      value: state as unknown as never,
      description: 'Estado da sincronização automática do HelpDesk (suporte)',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
}

async function loadAccountIndex(): Promise<AccountIndex> {
  const admin = getSupabaseAdminClient()
  const [{ data: accounts }, { data: contracts }, cfg] = await Promise.all([
    // helpdesk_tags pode não estar nos types gerados ainda → cast.
    (admin.from('accounts') as any).select('id, name, client_id, website, helpdesk_tags'),
    admin.from('contracts').select('account_id, instance_url'),
    getIntegrationConfig(),
  ])
  return buildAccountIndex(accounts ?? [], contracts ?? [], {
    code_map: cfg.code_map,
    domain_map: cfg.domain_map,
  })
}

async function upsertTicket(
  n: NormalizedTicket,
  accountId: string,
  result: SyncResult
): Promise<void> {
  const admin = getSupabaseAdminClient()

  const { data: existing } = await admin
    .from('support_tickets')
    .select('id, description, title')
    .eq('external_ticket_id', n.externalId)
    .maybeSingle()

  const { data: saved, error } = await admin
    .from('support_tickets')
    .upsert(
      {
        account_id: accountId,
        title: n.title,
        description: n.description || n.title,
        thread_content: n.threadContent,
        status: n.status,
        priority: n.priority,
        category: n.category,
        requester_email: n.requesterEmail,
        opened_at: n.openedAt ?? new Date().toISOString(),
        resolved_at: n.resolvedAt,
        closed_at: n.closedAt,
        first_response_at: n.firstResponseAt,
        external_ticket_id: n.externalId,
        source: 'helpdesk',
      },
      { onConflict: 'external_ticket_id' }
    )
    .select('id')
    .single()

  if (error || !saved) {
    result.errors.push(`Ticket ${n.externalId}: ${error?.message ?? 'falha no upsert'}`)
    return
  }

  if (existing) result.updated++
  else result.created++

  const contentChanged =
    !existing || existing.title !== n.title || existing.description !== (n.description || n.title)
  if (contentChanged) {
    try {
      await storeEmbeddings(accountId, 'support_ticket', saved.id, `${n.title}\n\n${n.description}`)
    } catch (err) {
      console.error(`[HelpDesk Sync] Vetorização falhou (ticket ${n.externalId}):`, err)
    }
  }

  if (n.rating) {
    const { error: csatErr } = await admin.from('csat_responses').upsert(
      {
        ticket_id: saved.id,
        account_id: accountId,
        score: n.rating.score,
        comment: n.rating.comment,
        respondent_email: n.requesterEmail ?? 'desconhecido@helpdesk',
        answered_at: n.resolvedAt ?? n.closedAt ?? new Date().toISOString(),
      },
      { onConflict: 'ticket_id' }
    )
    if (csatErr) result.errors.push(`CSAT ${n.externalId}: ${csatErr.message}`)
    else result.csat++
  }
}

export async function runHelpDeskSync(): Promise<SyncResult> {
  const token = await getBearerToken()
  if (!token) {
    throw new HelpDeskAuthError(
      'Sem token do HelpDesk. Rode o refresher de login para popular app_settings.helpdesk_token.'
    )
  }

  const state = await readState()
  const mode: SyncResult['mode'] = state.historical_done ? 'incremental' : 'historical'
  const stopBefore = mode === 'incremental' ? state.last_sync_at : null
  const startedAt = new Date().toISOString()

  const result: SyncResult = {
    mode,
    scanned: 0,
    created: 0,
    updated: 0,
    csat: 0,
    skipped: 0,
    pages: 0,
    tokenExpiresInDays: null,
    errors: [],
  }

  const accountIdx = await loadAccountIndex()
  const cfg = await getIntegrationConfig()
  const fallbackAccountId = cfg.fallback_account_id || env.helpdesk.fallbackAccountId || ''

  let page = 1
  let totalPages = 1
  outer: do {
    const { tickets, totalPages: tp, tokenExpiresIn } = await listTicketsPage(token, {
      page,
      pageSize: 100,
      statuses: STATUSES,
      sortBy: 'updatedAt',
      order: 'desc',
    })
    totalPages = tp
    result.pages = page
    if (tokenExpiresIn != null) {
      result.tokenExpiresInDays = Math.round((tokenExpiresIn / 86400) * 10) / 10
    }

    for (const raw of tickets) {
      const n = normalizeTicket(raw)
      if (!n) {
        result.skipped++
        continue
      }
      // Incremental: lista é updatedAt desc → ao achar algo já visto, encerra.
      if (stopBefore && n.updatedAt && n.updatedAt <= stopBefore) break outer

      result.scanned++

      const accountId = resolveAccountId(n, accountIdx) || fallbackAccountId || null
      if (!accountId) {
        result.skipped++
        result.errors.push(`Ticket ${n.externalId} (${n.subject}) — conta não identificada`)
        continue
      }

      try {
        await upsertTicket(n, accountId, result)
      } catch (err) {
        result.errors.push(
          `Ticket ${n.externalId}: ${err instanceof Error ? err.message : 'erro desconhecido'}`
        )
      }
    }
    page++
  } while (page <= totalPages)

  // Só dá a carga histórica por concluída se ela REALMENTE progrediu — senão um
  // backfill que falhou (ex.: todos os upserts barrados por constraint) marcaria
  // historical_done=true e as próximas runs cairiam em incremental, nunca reprocessando.
  const historicalDone =
    mode === 'incremental'
      ? true
      : result.created + result.updated > 0 || result.errors.length === 0
  await writeState({ historical_done: historicalDone, last_sync_at: startedAt })
  result.errors = result.errors.slice(0, 50)
  return result
}
