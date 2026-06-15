import { env } from '@/lib/env'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Cliente da HelpDesk REST API (https://api.helpdesk.com/v1).
 *
 * Autenticação: Bearer token. O token usado pelo próprio app web
 * (cookie `credentials.access_token`, formato regional `us-south1:...`) funciona
 * direto na API e dura ~5 dias (header `x-token-expires-in`). Não exige o plano
 * pago de API. O token é renovado por um refresher (login automatizado) e
 * guardado em app_settings.key = 'helpdesk_token'. Fallback: env HELPDESK_BEARER_TOKEN.
 *
 * Schema confirmado por reconhecimento na API real (2026-06-15):
 *  - Paginação por página: ?page=N&pageSize=100 (headers x-total-pages/x-total-results)
 *  - Filtro: status[]=solved&status[]=closed
 *  - rating: { rate: 'good' | 'bad', comment } | null
 *  - thread: events[] com type 'message' (message.text) e type 'status' ({new,old})
 */

const TOKEN_KEY = 'helpdesk_token'

export interface HelpDeskStatusEvent {
  type: 'status'
  date: string
  status: { new: string; old: string }
}
export interface HelpDeskMessageEvent {
  type: 'message'
  date: string
  message?: { text?: string; isPrivate?: boolean }
}
export type HelpDeskEvent =
  | HelpDeskStatusEvent
  | HelpDeskMessageEvent
  | { type: string; date?: string; [k: string]: unknown }

export interface HelpDeskTicket {
  ID: string
  shortID?: string
  subject?: string
  status?: string
  priority?: number
  createdAt?: string
  updatedAt?: string
  lastMessageAt?: string
  requester?: { email?: string; name?: string }
  teamIDs?: string[]
  rating?: { rate?: string; comment?: string } | null
  ratingRequestSent?: boolean
  events?: HelpDeskEvent[]
  [k: string]: unknown
}

interface PageResult {
  tickets: HelpDeskTicket[]
  totalPages: number
  totalResults: number
  tokenExpiresIn: number | null
}

/** Lê o Bearer token: app_settings.helpdesk_token → env HELPDESK_BEARER_TOKEN. */
export async function getBearerToken(): Promise<string | null> {
  const admin = getSupabaseAdminClient()
  const { data } = await admin
    .from('app_settings')
    .select('value')
    .eq('key', TOKEN_KEY)
    .maybeSingle()
  const stored = (data?.value as { access_token?: string } | null)?.access_token
  return stored || env.helpdesk.bearerToken || null
}

/** Persiste um novo Bearer token (usado pelo refresher). */
export async function storeBearerToken(accessToken: string, expiresInSeconds?: number): Promise<void> {
  const admin = getSupabaseAdminClient()
  await admin.from('app_settings').upsert(
    {
      key: TOKEN_KEY,
      value: {
        access_token: accessToken,
        refreshed_at: new Date().toISOString(),
        expires_in: expiresInSeconds ?? null,
      } as unknown as never,
      description: 'Bearer token do HelpDesk (renovado pelo refresher de login)',
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'key' }
  )
}

async function apiGet(
  path: string,
  token: string,
  params: Record<string, string | string[]> = {}
): Promise<Response> {
  const url = new URL(`${env.helpdesk.baseUrl}${path}`)
  for (const [k, v] of Object.entries(params)) {
    if (Array.isArray(v)) v.forEach((item) => url.searchParams.append(k, item))
    else if (v !== '') url.searchParams.set(k, v)
  }
  const res = await fetch(url.toString(), {
    headers: { Authorization: `Bearer ${token}`, Accept: 'application/json' },
    cache: 'no-store',
  })
  return res
}

/** Erro específico de token inválido/expirado, para o cron sinalizar o refresher. */
export class HelpDeskAuthError extends Error {}

/**
 * Lista uma página de tickets com os status informados.
 * A API responde um array puro; o total de páginas vem no header x-total-pages.
 */
export async function listTicketsPage(
  token: string,
  opts: { page: number; pageSize?: number; statuses?: string[]; sortBy?: string; order?: 'asc' | 'desc' }
): Promise<PageResult> {
  const params: Record<string, string | string[]> = {
    page: String(opts.page),
    pageSize: String(opts.pageSize ?? 100),
    sortBy: opts.sortBy ?? 'updatedAt',
    order: opts.order ?? 'desc',
  }
  // Sem statuses = traz TODOS os chamados (base "equalizada" com o HelpDesk).
  if (opts.statuses && opts.statuses.length) params['status[]'] = opts.statuses
  const res = await apiGet('/tickets', token, params)

  if (res.status === 401 || res.status === 403) {
    throw new HelpDeskAuthError(`HelpDesk token inválido/expirado (HTTP ${res.status}).`)
  }
  if (!res.ok) {
    const body = await res.text().catch(() => '')
    throw new Error(`HelpDesk API ${res.status} em /tickets: ${body.slice(0, 300)}`)
  }

  const tickets = (await res.json()) as HelpDeskTicket[]
  return {
    tickets: Array.isArray(tickets) ? tickets : [],
    totalPages: parseInt(res.headers.get('x-total-pages') ?? '1', 10) || 1,
    totalResults: parseInt(res.headers.get('x-total-results') ?? '0', 10) || 0,
    tokenExpiresIn: res.headers.get('x-token-expires-in')
      ? parseInt(res.headers.get('x-token-expires-in')!, 10)
      : null,
  }
}
