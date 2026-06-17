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
import { getBusinessMinutesBetween } from '@/lib/support/business-hours'
import { getBusinessHoursForAccount } from '@/lib/support/sla-policies'
import type { BusinessHours } from '@/lib/supabase/types'

/** Contexto de horário comercial (SLA) para calcular tempos úteis por conta. */
interface BusinessCtx {
  timezone: string
  getHours: (accountId: string) => Promise<BusinessHours[]>
}

/** Minutos úteis (horário comercial) entre dois instantes, null se faltar alguma ponta. */
async function businessMinutes(
  ctx: BusinessCtx,
  accountId: string,
  fromIso: string | null,
  toIso: string | null
): Promise<number | null> {
  if (!fromIso || !toIso) return null
  const from = new Date(fromIso)
  const to = new Date(toIso)
  if (isNaN(from.getTime()) || isNaN(to.getTime()) || to <= from) return null
  const hours = await ctx.getHours(accountId)
  return Math.round(getBusinessMinutesBetween(from, to, ctx.timezone, hours))
}

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
  result: SyncResult,
  ctx: BusinessCtx
): Promise<void> {
  const admin = getSupabaseAdminClient()

  const { data: existing } = await admin
    .from('support_tickets')
    .select('id, description, title')
    .eq('external_ticket_id', n.externalId)
    .maybeSingle()

  const openedAt = n.openedAt ?? new Date().toISOString()
  const [frBusiness, resBusiness] = await Promise.all([
    businessMinutes(ctx, accountId, openedAt, n.firstResponseAt),
    businessMinutes(ctx, accountId, openedAt, n.resolvedAt),
  ])

  // Tempo médio de resposta (solicitante→agente): corrido + útil (horário comercial).
  let avgRespMin: number | null = null
  let avgRespBusinessMin: number | null = null
  if (n.responseGaps.length) {
    const corrido = n.responseGaps
      .map((g) => (new Date(g.to).getTime() - new Date(g.from).getTime()) / 60000)
      .filter((v) => v >= 0)
    if (corrido.length) avgRespMin = Math.round(corrido.reduce((a, b) => a + b, 0) / corrido.length)
    const biz: number[] = []
    for (const g of n.responseGaps) {
      const b = await businessMinutes(ctx, accountId, g.from, g.to)
      if (b != null) biz.push(b)
    }
    if (biz.length) avgRespBusinessMin = Math.round(biz.reduce((a, b) => a + b, 0) / biz.length)
  }

  // cast: colunas first_response_business_minutes/etc. ainda não estão em database.types.
  const { data: saved, error } = await (admin.from('support_tickets') as any)
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
        opened_at: openedAt,
        resolved_at: n.resolvedAt,
        closed_at: n.closedAt,
        first_response_at: n.firstResponseAt,
        first_response_business_minutes: frBusiness,
        resolution_business_minutes: resBusiness,
        public_message_count: n.publicMessageCount,
        agent_reply_count: n.agentReplyCount,
        avg_response_minutes: avgRespMin,
        avg_response_business_minutes: avgRespBusinessMin,
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

  // Conversa completa (mensagens + logs): apaga e reinsere por chamado (idempotente).
  try {
    await (admin as any).from('helpdesk_thread_events').delete().eq('ticket_id', saved.id)
    if (n.thread.length) {
      const rows = n.thread.map((ev) => ({
        ticket_id: saved.id,
        external_event_id: ev.externalEventId,
        kind: ev.kind,
        author_type: ev.authorType,
        author_name: ev.authorName,
        author_email: ev.authorEmail,
        body_html: ev.bodyHtml,
        body_text: ev.bodyText,
        is_private: ev.isPrivate,
        attachments: ev.attachments,
        metadata: ev.metadata,
        occurred_at: ev.occurredAt,
      }))
      const { error: thErr } = await (admin as any).from('helpdesk_thread_events').insert(rows)
      if (thErr) console.error(`[HelpDesk Sync] thread insert (ticket ${n.externalId}):`, thErr.message)
    }
  } catch (e) {
    console.error(`[HelpDesk Sync] thread persist (ticket ${n.externalId}):`, e)
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

  // Contexto de horário comercial p/ tempos úteis (TMP/TMR em SLA). Timezone da política
  // global; horas por conta cacheadas (global + override da conta).
  const admin = getSupabaseAdminClient()
  const { data: slaPolicy } = await admin
    .from('sla_policies')
    .select('timezone')
    .eq('is_global', true)
    .eq('is_active', true)
    .maybeSingle()
  const hoursCache = new Map<string, BusinessHours[]>()
  const businessCtx: BusinessCtx = {
    timezone: slaPolicy?.timezone || 'America/Sao_Paulo',
    getHours: async (accId: string) => {
      const cached = hoursCache.get(accId)
      if (cached) return cached
      const hrs = await getBusinessHoursForAccount(accId)
      hoursCache.set(accId, hrs)
      return hrs
    },
  }

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
        await upsertTicket(n, accountId, result, businessCtx)
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
