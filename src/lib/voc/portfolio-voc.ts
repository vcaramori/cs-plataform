import { SupabaseClient } from '@supabase/supabase-js'
import { getNPSSegment } from '@/lib/supabase/types'

/**
 * Camada de agregação de Voz do Cliente (VoC).
 *
 * `buildVocSignals` é o NÚCLEO ÚNICO: unifica todas as fontes de sentimento em um
 * `VocSignal` comum, cada um carregando um payload `evidence` ("como foi avaliado").
 * É reusado pelo portfólio (`getPortfolioVoc`), pela visão por conta (`getAccountVoc`)
 * e pelo drill-down (`queryVocSignals`).
 *
 * Fontes (todas LEITURA — nenhuma chamada de IA aqui; enriquecimento é feito em cron):
 *  - interaction: `interactions.sentiment_score` (Read.ai = sentimento do próprio Read.ai;
 *    manual = IA nossa). Filtrado pela DATA do evento (não pela data de import).
 *  - nps: `nps_responses` (nota 0-10 → polaridade por segmento; comentário + tags).
 *  - support: `reply_sentiments` (label + score 0-1 + keywords + confidence) via ticket.
 *  - csat: `csat_responses` (nota 1-5 → normalizada p/ -1..1; comentário).
 *
 * NÃO usa tabelas/colunas ainda não populadas (interaction_themes, nps_responses.sentiment_score) —
 * isso entra na Fase 2 (enriquecimento assíncrono). Temas saem de tags (NPS) + keywords (suporte).
 */

export type Polarity = 'positive' | 'neutral' | 'negative'
export type VocSource = 'interaction' | 'nps' | 'support' | 'csat'
export type EvaluatedBy = 'readai' | 'ai_interaction' | 'ai_support' | 'nps_score' | 'csat_score'

export interface VocEvidence {
  evaluated_by: EvaluatedBy
  evaluated_by_label: string
  raw_score: number | null // nota original (NPS 0-10, CSAT 1-5, reply 0-1)
  scale: string // descrição legível da escala/origem
  title: string | null
  excerpt: string | null // texto-fonte (transcrição/comentário)
  keywords: string[]
  confidence: number | null
  author: string | null
  meta: Record<string, unknown> | null // participantes, report_url, duração, segmento, título do chamado…
  deep_link: string | null // onde abrir a fonte completa
}

export interface VocSignal {
  id: string // estável: `${source}:${source_id}`
  source: VocSource
  source_id: string
  account_id: string
  account_name: string
  polarity: Polarity
  score: number // -1..1 normalizado
  date: string // ISO
  excerpt: string | null
  terms: string[] // tags (NPS) / keywords (suporte) para temas
  evidence: VocEvidence
}

export interface AccountVoc {
  account_id: string
  name: string
  health_score: number
  segment: string | null
  avg_score: number // -1..1
  positive: number
  neutral: number
  negative: number
  volume: number
}

export interface VocDerived {
  trend: Array<{ date: string; sentiment: number; volume: number }>
  by_source: Array<{ source: VocSource; positive: number; neutral: number; negative: number }>
  top_pains: Array<{ label: string; count: number }>
  top_praises: Array<{ label: string; count: number }>
}

export interface PortfolioVoc extends VocDerived {
  kpis: {
    sentiment_index: number // -100..100
    volume: number
    positive_pct: number
    negative_pct: number
    accounts_at_risk: number
  }
  by_account: AccountVoc[]
  quotes: VocSignal[]
}

export interface AccountVocResult extends VocDerived {
  account: { account_id: string; name: string; health_score: number; segment: string | null }
  kpis: { sentiment_index: number; volume: number; positive_pct: number; negative_pct: number }
  signals: VocSignal[] // feed completo da conta (capado)
}

const SOURCES: VocSource[] = ['interaction', 'nps', 'support', 'csat']
const POLARITY_SCORE: Record<Polarity, number> = { positive: 1, neutral: 0, negative: -1 }
const SOURCE_CAP = 2000 // teto por fonte (evita explosão de memória em intervalos enormes)
const SIGNALS_PAGE_MAX = 300 // teto de itens por drill-down

const EVALUATED_BY_LABEL: Record<EvaluatedBy, string> = {
  readai: 'Avaliado pelo Read.ai',
  ai_interaction: 'Avaliado por IA (interação)',
  ai_support: 'Avaliado por IA (resposta do chamado)',
  nps_score: 'Nota direta do cliente (NPS)',
  csat_score: 'Avaliação direta pós-atendimento (CSAT)',
}

function scoreToPolarity(score: number): Polarity {
  if (score > 0.3) return 'positive'
  if (score < -0.3) return 'negative'
  return 'neutral'
}

function labelToPolarity(label: string | null): Polarity {
  const l = (label ?? '').toLowerCase()
  if (l.includes('pos')) return 'positive'
  if (l.includes('neg')) return 'negative'
  return 'neutral'
}

function truncate(text: string, max = 280): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > max ? `${t.slice(0, max)}…` : t
}

function toISO(value: string | null | undefined, fallback: string): string {
  if (!value) return fallback
  // date pura (YYYY-MM-DD) → meio-dia UTC para evitar deslize de fuso
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return `${value}T12:00:00.000Z`
  return value
}

/**
 * NÚCLEO: monta a lista unificada de sinais de voz no período.
 * `accountId` opcional restringe a uma conta (visão por conta / drill-down).
 */
export async function buildVocSignals(
  supabase: SupabaseClient,
  { accountId, dateFrom, dateTo }: { accountId?: string; dateFrom: string; dateTo: string }
): Promise<{ signals: VocSignal[]; accountMeta: Map<string, { name: string; health_score: number; segment: string | null }> }> {
  const fromDay = dateFrom.slice(0, 10)
  const toDay = dateTo.slice(0, 10)

  const accountsQuery = supabase.from('accounts').select('id, name, health_score, segment')

  let interQ = supabase
    .from('interactions')
    .select('id, account_id, sentiment_score, title, summary, raw_transcript, source, type, meta, date, created_at')
    .not('sentiment_score', 'is', null)
    .gte('date', fromDay)
    .lte('date', toDay)
    .order('date', { ascending: false })
    .limit(SOURCE_CAP)

  let npsQ = supabase
    .from('nps_responses')
    // NOTA: nps_responses.sentiment_score (sentimento do comentário) é coluna da FASE 2
    // (ainda não existe no banco) — por isso NÃO é selecionada aqui. NPS usa polaridade do segmento.
    .select('id, account_id, score, comment, tags, dismissed, is_test, responded_at, created_at')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)
    .order('created_at', { ascending: false })
    .limit(SOURCE_CAP)

  let repliesQ = supabase
    .from('reply_sentiments')
    .select('id, ticket_id, sentiment, score, keywords, confidence, created_at')
    .gte('created_at', dateFrom)
    .lte('created_at', dateTo)
    .order('created_at', { ascending: false })
    .limit(SOURCE_CAP)

  let csatQ = supabase
    .from('csat_responses')
    .select('id, ticket_id, account_id, score, comment, answered_at')
    .gte('answered_at', dateFrom)
    .lte('answered_at', dateTo)
    .order('answered_at', { ascending: false })
    .limit(SOURCE_CAP)

  if (accountId) {
    interQ = interQ.eq('account_id', accountId)
    npsQ = npsQ.eq('account_id', accountId)
    csatQ = csatQ.eq('account_id', accountId)
    // reply_sentiments não tem account_id; filtramos via tickets abaixo.
  }

  const [{ data: accounts }, { data: interactions }, { data: npsRows }, { data: replies }, { data: csats }] =
    await Promise.all([accountsQuery, interQ, npsQ, repliesQ, csatQ])

  const accountMeta = new Map<string, { name: string; health_score: number; segment: string | null }>()
  for (const a of (accounts as any[]) ?? []) {
    accountMeta.set(a.id, { name: a.name, health_score: Number(a.health_score ?? 0), segment: a.segment ?? null })
  }
  const nameOf = (id: string) => accountMeta.get(id)?.name ?? 'Conta'

  const signals: VocSignal[] = []

  // --- Interações (reuniões/QBRs) ---
  for (const i of (interactions as any[]) ?? []) {
    const score = Number(i.sentiment_score)
    const isReadAi = i.source === 'readai'
    const meta = (i.meta ?? {}) as Record<string, unknown>
    const excerpt = i.summary || i.raw_transcript || i.title || null
    signals.push({
      id: `interaction:${i.id}`,
      source: 'interaction',
      source_id: i.id,
      account_id: i.account_id,
      account_name: nameOf(i.account_id),
      polarity: scoreToPolarity(score),
      score,
      date: toISO(i.date, i.created_at),
      excerpt: excerpt ? truncate(excerpt) : null,
      terms: [],
      evidence: {
        evaluated_by: isReadAi ? 'readai' : 'ai_interaction',
        evaluated_by_label: EVALUATED_BY_LABEL[isReadAi ? 'readai' : 'ai_interaction'],
        raw_score: score,
        scale: isReadAi ? 'Sentimento do Read.ai (−1 a +1)' : 'IA sobre a interação (−1 a +1)',
        title: i.title ?? null,
        excerpt: i.raw_transcript ? truncate(i.raw_transcript, 1200) : (i.summary ? truncate(i.summary, 1200) : null),
        keywords: [],
        confidence: null,
        author: null,
        meta: {
          interaction_type: i.type ?? null,
          summary: i.summary ?? null,
          participants: meta.participants ?? null,
          report_url: meta.report_url ?? null,
          read_score: (meta as any).read_score ?? null,
        },
        deep_link: `/accounts/${i.account_id}`,
      },
    })
  }

  // --- NPS (exclui testes e dispensados) ---
  for (const n of (npsRows as any[]) ?? []) {
    if (n.is_test || n.dismissed) continue
    const segment = getNPSSegment(Number(n.score))
    const polarity: Polarity = segment === 'promoter' ? 'positive' : segment === 'detractor' ? 'negative' : 'neutral'
    const score = POLARITY_SCORE[polarity] // Fase 2: usar nps_responses.sentiment_score do comentário
    signals.push({
      id: `nps:${n.id}`,
      source: 'nps',
      source_id: n.id,
      account_id: n.account_id,
      account_name: nameOf(n.account_id),
      polarity,
      score,
      date: n.responded_at || n.created_at,
      excerpt: n.comment ? truncate(n.comment) : null,
      terms: Array.isArray(n.tags) ? n.tags.filter(Boolean) : [],
      evidence: {
        evaluated_by: 'nps_score',
        evaluated_by_label: EVALUATED_BY_LABEL.nps_score,
        raw_score: Number(n.score),
        scale: 'NPS (0 a 10)',
        title: `NPS ${n.score} · ${segment === 'promoter' ? 'Promotor' : segment === 'detractor' ? 'Detrator' : 'Neutro'}`,
        excerpt: n.comment ? truncate(n.comment, 1200) : null,
        keywords: Array.isArray(n.tags) ? n.tags.filter(Boolean) : [],
        confidence: null,
        author: null,
        meta: { segment, nps_score: Number(n.score) },
        deep_link: `/nps`,
      },
    })
  }

  // --- Suporte (reply_sentiments → ticket → conta) ---
  const ticketIds = [...new Set(((replies as any[]) ?? []).map((r) => r.ticket_id).filter(Boolean))]
  const ticketInfo = new Map<string, { account_id: string; title: string | null; status: string | null }>()
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id, account_id, title, status')
      .in('id', ticketIds)
    for (const t of (tickets as any[]) ?? []) {
      ticketInfo.set(t.id, { account_id: t.account_id, title: t.title ?? null, status: t.status ?? null })
    }
  }
  for (const r of (replies as any[]) ?? []) {
    const info = ticketInfo.get(r.ticket_id)
    if (!info?.account_id) continue
    if (accountId && info.account_id !== accountId) continue
    const polarity = labelToPolarity(r.sentiment)
    const raw = typeof r.score === 'number' ? Number(r.score) : null
    signals.push({
      id: `support:${r.id}`,
      source: 'support',
      source_id: r.id,
      account_id: info.account_id,
      account_name: nameOf(info.account_id),
      polarity,
      score: POLARITY_SCORE[polarity],
      date: r.created_at,
      excerpt: info.title ? truncate(info.title) : null,
      terms: Array.isArray(r.keywords) ? r.keywords.filter(Boolean) : [],
      evidence: {
        evaluated_by: 'ai_support',
        evaluated_by_label: EVALUATED_BY_LABEL.ai_support,
        raw_score: raw,
        scale: 'IA sobre a resposta do chamado (0 a 1)',
        title: info.title,
        excerpt: null, // texto da resposta fica no chamado (link abaixo)
        keywords: Array.isArray(r.keywords) ? r.keywords.filter(Boolean) : [],
        confidence: typeof r.confidence === 'number' ? Number(r.confidence) : null,
        author: null,
        meta: { ticket_id: r.ticket_id, ticket_status: info.status, sentiment_label: r.sentiment ?? null },
        deep_link: `/suporte/${r.ticket_id}`,
      },
    })
  }

  // --- CSAT (nota 1-5 pós-atendimento) ---
  for (const c of (csats as any[]) ?? []) {
    if (c.account_id == null) continue
    const raw = Number(c.score) // 1..5
    const norm = Math.max(-1, Math.min(1, (raw - 3) / 2)) // 1→-1, 3→0, 5→+1
    signals.push({
      id: `csat:${c.id}`,
      source: 'csat',
      source_id: c.id,
      account_id: c.account_id,
      account_name: nameOf(c.account_id),
      polarity: scoreToPolarity(norm),
      score: norm,
      date: c.answered_at,
      excerpt: c.comment ? truncate(c.comment) : null,
      terms: [],
      evidence: {
        evaluated_by: 'csat_score',
        evaluated_by_label: EVALUATED_BY_LABEL.csat_score,
        raw_score: raw,
        scale: 'CSAT (1 a 5)',
        title: `CSAT ${raw}/5`,
        excerpt: c.comment ? truncate(c.comment, 1200) : null,
        keywords: [],
        confidence: null,
        author: c.respondent_email ?? null,
        meta: { ticket_id: c.ticket_id, csat_score: raw },
        deep_link: c.ticket_id ? `/suporte/${c.ticket_id}` : null,
      },
    })
  }

  return { signals, accountMeta }
}

// ---------------------------------------------------------------------------
// Derivações compartilhadas (portfólio e conta)
// ---------------------------------------------------------------------------

function deriveTrend(signals: VocSignal[]): VocDerived['trend'] {
  const byDay = new Map<string, { sum: number; n: number }>()
  for (const s of signals) {
    const day = s.date.slice(0, 10)
    const d = byDay.get(day) ?? { sum: 0, n: 0 }
    d.sum += s.score
    d.n += 1
    byDay.set(day, d)
  }
  return [...byDay.entries()]
    .map(([date, d]) => ({ date, sentiment: Math.round((d.sum / d.n) * 100) / 100, volume: d.n }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

function deriveBySource(signals: VocSignal[]): VocDerived['by_source'] {
  return SOURCES.map((source) => {
    const subset = signals.filter((s) => s.source === source)
    return {
      source,
      positive: subset.filter((s) => s.polarity === 'positive').length,
      neutral: subset.filter((s) => s.polarity === 'neutral').length,
      negative: subset.filter((s) => s.polarity === 'negative').length,
    }
  }).filter((s) => s.positive + s.neutral + s.negative > 0)
}

function deriveThemes(signals: VocSignal[]): { top_pains: VocDerived['top_pains']; top_praises: VocDerived['top_praises'] } {
  const painMap = new Map<string, number>()
  const praiseMap = new Map<string, number>()
  for (const s of signals) {
    if (s.terms.length === 0) continue
    const target = s.polarity === 'negative' ? painMap : s.polarity === 'positive' ? praiseMap : null
    if (!target) continue
    for (const term of s.terms) {
      const key = String(term).trim()
      if (!key) continue
      target.set(key, (target.get(key) ?? 0) + 1)
    }
  }
  const top = (m: Map<string, number>) =>
    [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8)
  return { top_pains: top(painMap), top_praises: top(praiseMap) }
}

function deriveDerived(signals: VocSignal[]): VocDerived {
  const { top_pains, top_praises } = deriveThemes(signals)
  return { trend: deriveTrend(signals), by_source: deriveBySource(signals), top_pains, top_praises }
}

function emptyPortfolio(): PortfolioVoc {
  return {
    kpis: { sentiment_index: 0, volume: 0, positive_pct: 0, negative_pct: 0, accounts_at_risk: 0 },
    trend: [],
    by_account: [],
    by_source: [],
    top_pains: [],
    top_praises: [],
    quotes: [],
  }
}

// ---------------------------------------------------------------------------
// Portfólio
// ---------------------------------------------------------------------------

export async function getPortfolioVoc(
  supabase: SupabaseClient,
  { dateFrom, dateTo }: { dateFrom: string; dateTo: string }
): Promise<PortfolioVoc> {
  const { signals, accountMeta } = await buildVocSignals(supabase, { dateFrom, dateTo })
  if (signals.length === 0) return emptyPortfolio()

  const volume = signals.length
  const positive = signals.filter((s) => s.polarity === 'positive').length
  const negative = signals.filter((s) => s.polarity === 'negative').length
  const sentiment_index = Math.round((signals.reduce((sum, s) => sum + s.score, 0) / volume) * 100)

  // Por conta (piores primeiro)
  const byAccountMap = new Map<string, { sum: number; positive: number; neutral: number; negative: number; volume: number }>()
  for (const s of signals) {
    const a = byAccountMap.get(s.account_id) ?? { sum: 0, positive: 0, neutral: 0, negative: 0, volume: 0 }
    a.sum += s.score
    a[s.polarity] += 1
    a.volume += 1
    byAccountMap.set(s.account_id, a)
  }
  const by_account: AccountVoc[] = [...byAccountMap.entries()]
    .map(([account_id, a]) => {
      const meta = accountMeta.get(account_id)
      return {
        account_id,
        name: meta?.name ?? 'Conta',
        health_score: meta?.health_score ?? 0,
        segment: meta?.segment ?? null,
        avg_score: Math.round((a.sum / a.volume) * 100) / 100,
        positive: a.positive,
        neutral: a.neutral,
        negative: a.negative,
        volume: a.volume,
      }
    })
    .sort((x, y) => x.avg_score - y.avg_score)

  const accounts_at_risk = by_account.filter((a) => a.avg_score < -0.3).length

  const quotes = signals
    .filter((s) => s.excerpt && s.polarity !== 'neutral')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 24)

  return {
    kpis: {
      sentiment_index,
      volume,
      positive_pct: Math.round((positive / volume) * 100),
      negative_pct: Math.round((negative / volume) * 100),
      accounts_at_risk,
    },
    by_account,
    quotes,
    ...deriveDerived(signals),
  }
}

// ---------------------------------------------------------------------------
// Conta
// ---------------------------------------------------------------------------

export async function getAccountVoc(
  supabase: SupabaseClient,
  accountId: string,
  { dateFrom, dateTo }: { dateFrom: string; dateTo: string }
): Promise<AccountVocResult> {
  const { signals, accountMeta } = await buildVocSignals(supabase, { accountId, dateFrom, dateTo })
  const meta = accountMeta.get(accountId)
  const account = {
    account_id: accountId,
    name: meta?.name ?? 'Conta',
    health_score: meta?.health_score ?? 0,
    segment: meta?.segment ?? null,
  }
  const volume = signals.length
  if (volume === 0) {
    return { account, kpis: { sentiment_index: 0, volume: 0, positive_pct: 0, negative_pct: 0 }, signals: [], trend: [], by_source: [], top_pains: [], top_praises: [] }
  }
  const positive = signals.filter((s) => s.polarity === 'positive').length
  const negative = signals.filter((s) => s.polarity === 'negative').length
  const sentiment_index = Math.round((signals.reduce((sum, s) => sum + s.score, 0) / volume) * 100)

  const feed = [...signals].sort((a, b) => b.date.localeCompare(a.date)).slice(0, SIGNALS_PAGE_MAX)

  return {
    account,
    kpis: {
      sentiment_index,
      volume,
      positive_pct: Math.round((positive / volume) * 100),
      negative_pct: Math.round((negative / volume) * 100),
    },
    signals: feed,
    ...deriveDerived(signals),
  }
}

// ---------------------------------------------------------------------------
// Drill-down (Drawer de Sinais)
// ---------------------------------------------------------------------------

export interface VocSignalsFilter {
  dateFrom: string
  dateTo: string
  source?: VocSource
  polarity?: Polarity
  theme?: string // tag/keyword exata
  account_id?: string
  day?: string // YYYY-MM-DD (ponto da tendência)
}

export async function queryVocSignals(
  supabase: SupabaseClient,
  filter: VocSignalsFilter
): Promise<{ signals: VocSignal[]; total: number }> {
  const { signals } = await buildVocSignals(supabase, {
    accountId: filter.account_id,
    dateFrom: filter.dateFrom,
    dateTo: filter.dateTo,
  })
  const themeLc = filter.theme?.toLowerCase()
  const filtered = signals.filter((s) => {
    if (filter.source && s.source !== filter.source) return false
    if (filter.polarity && s.polarity !== filter.polarity) return false
    if (filter.day && s.date.slice(0, 10) !== filter.day) return false
    if (themeLc && !s.terms.some((t) => t.toLowerCase() === themeLc)) return false
    return true
  })
  filtered.sort((a, b) => b.date.localeCompare(a.date))
  return { signals: filtered.slice(0, SIGNALS_PAGE_MAX), total: filtered.length }
}
