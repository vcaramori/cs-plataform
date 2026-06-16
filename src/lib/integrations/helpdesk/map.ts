import type { HelpDeskTicket, HelpDeskEvent, HelpDeskStatusEvent } from './client'

/**
 * Normalização do payload REAL da HelpDesk API para o modelo do cs-plataform.
 * Schema confirmado por reconhecimento na API (2026-06-15).
 */

export type AppStatus = 'open' | 'in-progress' | 'resolved' | 'closed'
export type AppPriority = 'low' | 'medium' | 'high' | 'critical'

export interface NormalizedTicket {
  externalId: string
  title: string
  description: string
  threadContent: string | null
  status: AppStatus
  priority: AppPriority
  category: string | null
  requesterEmail: string | null
  subject: string
  openedAt: string | null
  resolvedAt: string | null
  closedAt: string | null
  updatedAt: string | null
  rating: { score: number; comment: string | null } | null
}

// HelpDesk: open, pending, onhold, solved, closed.
export function mapStatus(raw: string | undefined): AppStatus {
  const v = (raw ?? '').toLowerCase().trim()
  const map: Record<string, AppStatus> = {
    open: 'open',
    new: 'open',
    pending: 'in-progress',
    onhold: 'in-progress',
    'on-hold': 'in-progress',
    solved: 'resolved',
    resolved: 'resolved',
    closed: 'closed',
  }
  return map[v] ?? 'open'
}

// HelpDesk priority é numérico (visto: 0 = normal, 10 = alta). Escala defensiva.
export function mapPriority(raw: number | undefined): AppPriority {
  const n = typeof raw === 'number' ? raw : 0
  if (n <= 0) return 'medium'
  if (n < 10) return 'high'
  if (n === 10) return 'high'
  return 'critical'
}

// rating: { rate: 'good' | 'bad', comment } → score numérico (good=5, bad=1).
function extractRating(t: HelpDeskTicket): NormalizedTicket['rating'] {
  const r = t.rating
  if (!r || !r.rate) return null
  const rate = r.rate.toLowerCase().trim()
  let score: number | null = null
  if (rate === 'good' || rate === 'positive') score = 5
  else if (rate === 'bad' || rate === 'negative') score = 1
  else {
    const n = Number(rate)
    if (!isNaN(n) && n > 0) score = Math.round(n)
  }
  if (score === null) return null
  return { score, comment: (r.comment ?? '').trim() || null }
}

function isStatusEvent(e: HelpDeskEvent): e is HelpDeskStatusEvent {
  return e.type === 'status'
}

/** Data do ÚLTIMO evento de status cujo `new` casa com o alvo (solved/closed). */
function lastStatusDate(events: HelpDeskEvent[] | undefined, target: string): string | null {
  if (!events) return null
  let date: string | null = null
  for (const e of events) {
    if (isStatusEvent(e) && e.status?.new === target && e.date) date = e.date
  }
  return date
}

/** Concatena os textos das mensagens públicas da thread. */
function buildThread(events: HelpDeskEvent[] | undefined): { description: string; thread: string } {
  if (!events) return { description: '', thread: '' }
  const texts: string[] = []
  for (const e of events) {
    if (e.type === 'message') {
      const msg = (e as { message?: { text?: string; isPrivate?: boolean } }).message
      if (msg && msg.isPrivate !== true && msg.text) texts.push(msg.text.trim())
    }
  }
  return { description: texts[0] ?? '', thread: texts.join('\n\n---\n\n') }
}

export function normalizeTicket(t: HelpDeskTicket): NormalizedTicket | null {
  if (!t.ID) return null
  const subject = (t.subject ?? '').trim() || 'Sem título'
  const { description, thread } = buildThread(t.events)

  return {
    externalId: t.ID,
    title: subject.slice(0, 255),
    description: description || subject,
    threadContent: thread || null,
    status: mapStatus(t.status),
    priority: mapPriority(t.priority),
    category: Array.isArray(t.teamIDs) && t.teamIDs.length ? t.teamIDs[0] : null,
    requesterEmail: t.requester?.email ?? null,
    subject,
    openedAt: t.createdAt ?? null,
    resolvedAt: lastStatusDate(t.events, 'solved'),
    closedAt: lastStatusDate(t.events, 'closed'),
    updatedAt: t.updatedAt ?? t.lastMessageAt ?? null,
    rating: extractRating(t),
  }
}

// ---------------------------------------------------------------------------
// Resolução de conta — cascata: código [XXXX] no assunto (= subdomínio da
// instance_url do contrato) → domínio do e-mail → nome.
// ---------------------------------------------------------------------------

export interface AccountIndex {
  byName: Map<string, string>
  byCode: Map<string, string>
  byDomain: Map<string, string>
  bySubdomain: Map<string, string>
  /** de-para explícito código→account_id (gerido na config) */
  codeMap: Map<string, string>
  /** de-para explícito domínio→account_id (gerido na config) */
  domainMap: Map<string, string>
}

const normalize = (s: string) =>
  s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

function subdomainOf(url: string): string | null {
  const host = url.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
  if (!host) return null
  const parts = host.split('.')
  return parts.length >= 2 ? normalize(parts[0]) : normalize(host)
}

export function buildAccountIndex(
  accounts: Array<{ id: string; name: string; client_id: string | null; website: string | null }>,
  contracts: Array<{ account_id: string; instance_url: string | null }> = [],
  maps: { code_map?: Record<string, string>; domain_map?: Record<string, string> } = {}
): AccountIndex {
  const byName = new Map<string, string>()
  const byCode = new Map<string, string>()
  const byDomain = new Map<string, string>()
  const bySubdomain = new Map<string, string>()
  const codeMap = new Map<string, string>()
  const domainMap = new Map<string, string>()
  for (const [k, v] of Object.entries(maps.code_map ?? {})) codeMap.set(normalize(k), v)
  for (const [k, v] of Object.entries(maps.domain_map ?? {})) domainMap.set(normalize(k), v)
  for (const a of accounts) {
    if (a.name) byName.set(normalize(a.name), a.id)
    if (a.client_id) byCode.set(normalize(a.client_id), a.id)
    if (a.website) {
      const dom = a.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      if (dom) byDomain.set(normalize(dom), a.id)
    }
  }
  for (const c of contracts) {
    if (c.instance_url) {
      const sub = subdomainOf(c.instance_url)
      if (sub) bySubdomain.set(sub, c.account_id)
    }
  }
  return { byName, byCode, byDomain, bySubdomain, codeMap, domainMap }
}

const isInternalDomain = (d: string) => d === 'plannera.com.br' || d === 'plannera.com'

export function resolveAccountId(t: NormalizedTicket, idx: AccountIndex): string | null {
  const codeMatch = t.subject.match(/\[([^\]]+)\]/)
  const domain = t.requesterEmail?.includes('@') ? normalize(t.requesterEmail.split('@')[1] ?? '') : ''

  // 1) Código entre colchetes — de-para explícito por TOKEN (resolve "[S&OP LINDT BR]",
  //    "[SOE-GMILLS]", "[SKLA - S&OE]" etc.), depois subdomínio do contrato.
  if (codeMatch) {
    const raw = normalize(codeMatch[1])
    if (idx.codeMap.has(raw)) return idx.codeMap.get(raw)!
    for (const tokRaw of codeMatch[1].split(/[^A-Za-z0-9]+/)) {
      const tok = normalize(tokRaw)
      if (tok && idx.codeMap.has(tok)) return idx.codeMap.get(tok)!
    }
    if (idx.bySubdomain.has(raw)) return idx.bySubdomain.get(raw)!
    if (idx.byCode.has(raw)) return idx.byCode.get(raw)!
  }

  // 2) Domínio do e-mail (ignora domínios internos — nesses casos o código é o sinal).
  if (domain && !isInternalDomain(domain)) {
    if (idx.domainMap.has(domain)) return idx.domainMap.get(domain)!
    if (idx.byDomain.has(domain)) return idx.byDomain.get(domain)!
    const core = domain.split('.')[0]
    for (const [name, id] of idx.byName) {
      if (name.replace(/\s/g, '').includes(core) || core.includes(name.replace(/\s/g, ''))) return id
    }
  }

  return null
}
