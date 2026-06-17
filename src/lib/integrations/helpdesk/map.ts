import type { HelpDeskTicket, HelpDeskEvent, HelpDeskStatusEvent, HelpDeskMessageEvent } from './client'

/**
 * Normalização do payload REAL da HelpDesk API para o modelo do cs-plataform.
 * Schema confirmado por reconhecimento na API (2026-06-15).
 */

// Valores DEVEM casar com o CHECK de support_tickets.status (underscore, não hífen).
export type AppStatus = 'open' | 'in_progress' | 'resolved' | 'closed'
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
  firstResponseAt: string | null  // 1ª resposta de um AGENTE (não privada)
  publicMessageCount: number       // mensagens públicas (cliente+agente) = interações
  agentReplyCount: number          // respostas públicas do agente (FCR = 1)
  thread: ThreadEvent[]            // conversa completa (mensagens + logs) p/ a tela de detalhe
  responseGaps: ResponseGap[]      // pares solicitante→resposta do agente (tempo médio de resposta)
  updatedAt: string | null
  rating: { score: number; comment: string | null } | null
}

export type ThreadAttachment = { name: string; url: string; type: string | null; size: number | null }
export type ThreadEventKind = 'message' | 'note' | 'status' | 'assignment' | 'rating_request'
export interface ThreadEvent {
  externalEventId: string | null
  kind: ThreadEventKind
  authorType: 'client' | 'agent' | 'system' | null
  authorName: string | null
  authorEmail: string | null
  bodyHtml: string | null          // HTML do e-mail com imagens inline (cid→url) reescritas
  bodyText: string | null
  isPrivate: boolean
  attachments: ThreadAttachment[]
  metadata: Record<string, unknown> | null
  occurredAt: string
}
export type ResponseGap = { from: string; to: string }

// HelpDesk: open, pending, onhold, solved, closed.
export function mapStatus(raw: string | undefined): AppStatus {
  const v = (raw ?? '').toLowerCase().trim()
  const map: Record<string, AppStatus> = {
    open: 'open',
    new: 'open',
    pending: 'in_progress',
    onhold: 'in_progress',
    'on-hold': 'in_progress',
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

/** Data da PRIMEIRA mensagem pública de um AGENTE (= tempo de 1ª resposta). */
function firstAgentResponseDate(events: HelpDeskEvent[] | undefined): string | null {
  if (!events) return null
  for (const e of events) {
    if (e.type !== 'message') continue
    const msg = (e as HelpDeskMessageEvent).message
    const author = (e as HelpDeskMessageEvent).author
    if (msg && msg.isPrivate !== true && author?.type === 'agent' && e.date) return e.date
  }
  return null
}

/** Conta mensagens públicas (total e do agente) — base de "interações" e FCR. */
function countMessages(events: HelpDeskEvent[] | undefined): { publicCount: number; agentCount: number } {
  if (!events) return { publicCount: 0, agentCount: 0 }
  let publicCount = 0
  let agentCount = 0
  for (const e of events) {
    if (e.type !== 'message') continue
    const me = e as HelpDeskMessageEvent
    if (me.message && me.message.isPrivate !== true) {
      publicCount++
      if (me.author?.type === 'agent') agentCount++
    }
  }
  return { publicCount, agentCount }
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

/**
 * Reconstrói a conversa completa do chamado a partir dos `events` do HelpDesk:
 * mensagens (HTML com imagens inline cid→url + anexos), notas privadas, mudanças de
 * status, atribuições e pedido de avaliação. Mantém a ordem cronológica original.
 */
function buildThreadEvents(rawEvents: HelpDeskEvent[] | undefined): ThreadEvent[] {
  const events = (rawEvents ?? []) as any[]

  // 1) Mapa cid→arquivo (imagens inline e anexos vêm em eventos type:'attachments').
  const cidMap = new Map<string, ThreadAttachment>()
  for (const e of events) {
    const files = e?.attachments?.files
    if (Array.isArray(files)) {
      for (const f of files) {
        if (f?.url && f?.cid) cidMap.set(f.cid, { name: f.name ?? 'arquivo', url: f.url, type: f.type ?? null, size: typeof f.size === 'number' ? f.size : null })
      }
    }
  }
  // 2) cids realmente usados inline no corpo das mensagens (para não duplicar como anexo).
  const inlineCids = new Set<string>()
  for (const e of events) {
    if (e?.type === 'message' && typeof e?.message?.richTextHtml === 'string') {
      for (const m of e.message.richTextHtml.matchAll(/cid:([^"')\s]+)/gi)) inlineCids.add(m[1])
    }
  }
  const rewriteCids = (html: string) =>
    html.replace(/src=["']cid:([^"']+)["']/gi, (full, cid) => {
      const f = cidMap.get(cid)
      return f ? `src="${f.url}"` : full
    })

  const out: ThreadEvent[] = []
  let lastMessage: ThreadEvent | null = null

  for (const e of events) {
    const occurredAt = e?.date ?? null
    if (!occurredAt) continue
    const author = e?.author ?? null
    const authorType: ThreadEvent['authorType'] =
      author?.type === 'client' || author?.type === 'agent' ? author.type : 'system'
    const authorName = author?.name ?? null
    const authorEmail = author?.email ?? null

    if (e.type === 'message') {
      const m = e.message ?? {}
      const isPrivate = m.isPrivate === true
      const html = typeof m.richTextHtml === 'string' && m.richTextHtml.trim() ? rewriteCids(m.richTextHtml) : null
      const row: ThreadEvent = {
        externalEventId: e.ID ?? null,
        kind: isPrivate ? 'note' : 'message',
        authorType, authorName, authorEmail,
        bodyHtml: html,
        bodyText: (m.text ?? m.stripped ?? '').trim() || null,
        isPrivate,
        attachments: [],
        metadata: null,
        occurredAt,
      }
      out.push(row)
      lastMessage = row
    } else if (e.type === 'attachments') {
      const files = e?.attachments?.files
      if (Array.isArray(files) && lastMessage) {
        for (const f of files) {
          if (!f?.url) continue
          if (f.cid && inlineCids.has(f.cid)) continue // já renderizada inline no HTML
          lastMessage.attachments.push({ name: f.name ?? 'arquivo', url: f.url, type: f.type ?? null, size: typeof f.size === 'number' ? f.size : null })
        }
      }
    } else if (e.type === 'status') {
      out.push({ externalEventId: e.ID ?? null, kind: 'status', authorType, authorName, authorEmail, bodyHtml: null, bodyText: null, isPrivate: false, attachments: [], metadata: { status_old: e.status?.old ?? null, status_new: e.status?.new ?? null }, occurredAt })
    } else if (e.type === 'assignment') {
      out.push({ externalEventId: e.ID ?? null, kind: 'assignment', authorType, authorName, authorEmail, bodyHtml: null, bodyText: null, isPrivate: false, attachments: [], metadata: (e.assignment ?? null) as Record<string, unknown> | null, occurredAt })
    } else if (e.type === 'ratingRequestSent') {
      out.push({ externalEventId: e.ID ?? null, kind: 'rating_request', authorType, authorName, authorEmail, bodyHtml: null, bodyText: null, isPrivate: false, attachments: [], metadata: null, occurredAt })
    }
    // demais tipos (tags, followers, subject, priority, spam) não entram na thread visível
  }
  return out
}

/** Pares solicitante→resposta-do-agente para o tempo médio de resposta. */
function buildResponseGaps(thread: ThreadEvent[]): ResponseGap[] {
  const msgs = thread
    .filter((t) => t.kind === 'message' && !t.isPrivate)
    .sort((a, b) => (a.occurredAt < b.occurredAt ? -1 : 1))
  const gaps: ResponseGap[] = []
  let pendingClient: string | null = null
  for (const m of msgs) {
    if (m.authorType === 'client') {
      if (!pendingClient) pendingClient = m.occurredAt
    } else if (m.authorType === 'agent') {
      if (pendingClient) { gaps.push({ from: pendingClient, to: m.occurredAt }); pendingClient = null }
    }
  }
  return gaps
}

export function normalizeTicket(t: HelpDeskTicket): NormalizedTicket | null {
  if (!t.ID) return null
  const subject = (t.subject ?? '').trim() || 'Sem título'
  const { description, thread } = buildThread(t.events)
  const { publicCount, agentCount } = countMessages(t.events)
  const threadEvents = buildThreadEvents(t.events)
  const responseGaps = buildResponseGaps(threadEvents)

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
    firstResponseAt: firstAgentResponseDate(t.events),
    publicMessageCount: publicCount,
    agentReplyCount: agentCount,
    thread: threadEvents,
    responseGaps,
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
  accounts: Array<{ id: string; name: string; client_id: string | null; website: string | null; helpdesk_tags?: string | null }>,
  contracts: Array<{ account_id: string; instance_url: string | null }> = [],
  maps: { code_map?: Record<string, string>; domain_map?: Record<string, string> } = {}
): AccountIndex {
  const byName = new Map<string, string>()
  const byCode = new Map<string, string>()
  const byDomain = new Map<string, string>()
  const bySubdomain = new Map<string, string>()
  const codeMap = new Map<string, string>()
  const domainMap = new Map<string, string>()
  // Config maps (opcionais, compatibilidade) entram primeiro; campos da conta sobrescrevem.
  for (const [k, v] of Object.entries(maps.code_map ?? {})) codeMap.set(normalize(k), v)
  for (const [k, v] of Object.entries(maps.domain_map ?? {})) domainMap.set(normalize(k), v)
  for (const a of accounts) {
    if (a.name) byName.set(normalize(a.name), a.id)
    if (a.client_id) byCode.set(normalize(a.client_id), a.id)
    if (a.website) {
      const dom = a.website.replace(/^https?:\/\//, '').replace(/^www\./, '').split('/')[0]
      if (dom) domainMap.set(normalize(dom), a.id) // website da conta = de-para de domínio
    }
    // Tags do HelpDesk (separadas por vírgula/;) = de-para de código, editável na UI.
    for (const tag of (a.helpdesk_tags ?? '').split(/[,;]+/)) {
      const t = normalize(tag)
      if (t) codeMap.set(t, a.id)
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

  // 2) Domínio do e-mail (ignora domínios internos — nesses casos o cliente está no assunto).
  if (domain && !isInternalDomain(domain)) {
    if (idx.domainMap.has(domain)) return idx.domainMap.get(domain)!
    // Tags também aceitam domínios alternativos (ex.: Suvinil recebe de sherwin.com).
    if (idx.codeMap.has(domain)) return idx.codeMap.get(domain)!
    if (idx.byDomain.has(domain)) return idx.byDomain.get(domain)!
    const core = domain.split('.')[0]
    for (const [name, id] of idx.byName) {
      if (name.replace(/\s/g, '').includes(core) || core.includes(name.replace(/\s/g, ''))) return id
    }
  }

  // 3) Nome da conta mencionado no assunto (o cliente quase sempre é citado no subject,
  //    inclusive nos chamados internos da Plannera). Exige nome com >=5 chars p/ evitar
  //    falsos positivos; prioriza o nome mais longo encontrado.
  const subjNorm = normalize(t.subject).replace(/\s/g, '')
  let best: { id: string; len: number } | null = null
  for (const [name, id] of idx.byName) {
    const n = name.replace(/\s/g, '')
    if (n.length >= 5 && subjNorm.includes(n) && (!best || n.length > best.len)) {
      best = { id, len: n.length }
    }
  }
  if (best) return best.id

  return null
}
