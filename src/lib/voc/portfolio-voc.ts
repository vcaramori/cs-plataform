import { SupabaseClient } from '@supabase/supabase-js'
import { getNPSSegment } from '@/lib/supabase/types'

/**
 * Camada de agregação de Voz do Cliente (VoC) no nível de PORTFÓLIO.
 *
 * Unifica os sinais de sentimento de todas as fontes disponíveis na ferramenta
 * — interações (reuniões/QBRs), NPS e suporte (reply_sentiments) — num sinal
 * comum, e agrega para o dashboard de portfólio. Não depende de tabelas/colunas
 * inexistentes (interaction_themes, interactions.description/quotes,
 * nps_responses.sentiment_score). Temas saem de tags (NPS) + keywords (suporte).
 */

export type Polarity = 'positive' | 'neutral' | 'negative'
export type VocSource = 'interaction' | 'nps' | 'support'

interface VocSignal {
  account_id: string
  source: VocSource
  polarity: Polarity
  score: number // -1..1
  excerpt: string | null
  date: string // ISO
  terms: string[] // tags (NPS) / keywords (suporte) para temas
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

export interface PortfolioVoc {
  kpis: {
    sentiment_index: number // -100..100
    volume: number
    positive_pct: number
    negative_pct: number
    accounts_at_risk: number
  }
  trend: Array<{ date: string; sentiment: number }>
  by_account: AccountVoc[]
  by_source: Array<{ source: VocSource; positive: number; neutral: number; negative: number }>
  top_pains: Array<{ label: string; count: number }>
  top_praises: Array<{ label: string; count: number }>
  quotes: Array<{
    excerpt: string
    polarity: Polarity
    account_id: string
    account_name: string
    source: VocSource
    date: string
  }>
}

const POLARITY_SCORE: Record<Polarity, number> = { positive: 1, neutral: 0, negative: -1 }

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

function truncate(text: string, max = 240): string {
  const t = text.trim().replace(/\s+/g, ' ')
  return t.length > max ? `${t.slice(0, max)}…` : t
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

export async function getPortfolioVoc(
  supabase: SupabaseClient,
  { dateFrom, dateTo }: { dateFrom: string; dateTo: string }
): Promise<PortfolioVoc> {
  // 1. Carrega cada fonte no período + contas
  const [
    { data: accounts },
    { data: interactions },
    { data: npsRows },
    { data: replies },
  ] = await Promise.all([
    supabase.from('accounts').select('id, name, health_score, segment'),
    supabase
      .from('interactions')
      .select('account_id, sentiment_score, title, raw_transcript, source, created_at')
      .not('sentiment_score', 'is', null)
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo),
    supabase
      .from('nps_responses')
      .select('account_id, score, comment, tags, dismissed, is_test, created_at')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo),
    supabase
      .from('reply_sentiments')
      .select('ticket_id, sentiment, keywords, created_at')
      .gte('created_at', dateFrom)
      .lte('created_at', dateTo),
  ])

  const accountMeta = new Map<string, { name: string; health_score: number; segment: string | null }>()
  for (const a of (accounts as any[]) ?? []) {
    accountMeta.set(a.id, { name: a.name, health_score: Number(a.health_score ?? 0), segment: a.segment ?? null })
  }

  const signals: VocSignal[] = []

  // 1a. Interações
  for (const i of (interactions as any[]) ?? []) {
    const score = Number(i.sentiment_score)
    const excerpt = i.title || (i.raw_transcript ? truncate(i.raw_transcript) : null)
    signals.push({
      account_id: i.account_id,
      source: 'interaction',
      polarity: scoreToPolarity(score),
      score,
      excerpt: excerpt ? truncate(excerpt) : null,
      date: i.created_at,
      terms: [],
    })
  }

  // 1b. NPS (exclui testes e dispensados)
  for (const n of (npsRows as any[]) ?? []) {
    if (n.is_test || n.dismissed) continue
    const segment = getNPSSegment(Number(n.score))
    const polarity: Polarity = segment === 'promoter' ? 'positive' : segment === 'detractor' ? 'negative' : 'neutral'
    signals.push({
      account_id: n.account_id,
      source: 'nps',
      polarity,
      score: POLARITY_SCORE[polarity],
      excerpt: n.comment ? truncate(n.comment) : null,
      date: n.created_at,
      terms: Array.isArray(n.tags) ? n.tags.filter(Boolean) : [],
    })
  }

  // 1c. Suporte (reply_sentiments → ticket → account)
  const ticketIds = [...new Set(((replies as any[]) ?? []).map(r => r.ticket_id).filter(Boolean))]
  const ticketAccount = new Map<string, string>()
  if (ticketIds.length > 0) {
    const { data: tickets } = await supabase
      .from('support_tickets')
      .select('id, account_id')
      .in('id', ticketIds)
    for (const t of (tickets as any[]) ?? []) ticketAccount.set(t.id, t.account_id)
  }
  for (const r of (replies as any[]) ?? []) {
    const accId = ticketAccount.get(r.ticket_id)
    if (!accId) continue
    const polarity = labelToPolarity(r.sentiment)
    signals.push({
      account_id: accId,
      source: 'support',
      polarity,
      score: POLARITY_SCORE[polarity],
      excerpt: null,
      date: r.created_at,
      terms: Array.isArray(r.keywords) ? r.keywords.filter(Boolean) : [],
    })
  }

  if (signals.length === 0) return emptyPortfolio()

  // 2. KPIs
  const volume = signals.length
  const positive = signals.filter(s => s.polarity === 'positive').length
  const negative = signals.filter(s => s.polarity === 'negative').length
  const sentiment_index = Math.round((signals.reduce((sum, s) => sum + s.score, 0) / volume) * 100)

  // 3. Tendência (média diária)
  const byDay = new Map<string, { sum: number; n: number }>()
  for (const s of signals) {
    const day = s.date.slice(0, 10)
    const d = byDay.get(day) ?? { sum: 0, n: 0 }
    d.sum += s.score
    d.n += 1
    byDay.set(day, d)
  }
  const trend = [...byDay.entries()]
    .map(([date, d]) => ({ date, sentiment: Math.round((d.sum / d.n) * 100) / 100 }))
    .sort((a, b) => a.date.localeCompare(b.date))

  // 4. Por conta (piores primeiro)
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

  const accounts_at_risk = by_account.filter(a => a.avg_score < -0.3).length

  // 5. Por fonte
  const sources: VocSource[] = ['interaction', 'nps', 'support']
  const by_source = sources
    .map(source => {
      const subset = signals.filter(s => s.source === source)
      return {
        source,
        positive: subset.filter(s => s.polarity === 'positive').length,
        neutral: subset.filter(s => s.polarity === 'neutral').length,
        negative: subset.filter(s => s.polarity === 'negative').length,
      }
    })
    .filter(s => s.positive + s.neutral + s.negative > 0)

  // 6. Temas (tags + keywords), separados por polaridade do sinal
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
  const topTerms = (m: Map<string, number>) =>
    [...m.entries()].map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 5)

  // 7. Citações (com texto), polaridade forte primeiro, mais recentes
  const quotes = signals
    .filter(s => s.excerpt && s.polarity !== 'neutral')
    .sort((a, b) => b.date.localeCompare(a.date))
    .slice(0, 12)
    .map(s => ({
      excerpt: s.excerpt as string,
      polarity: s.polarity,
      account_id: s.account_id,
      account_name: accountMeta.get(s.account_id)?.name ?? 'Conta',
      source: s.source,
      date: s.date,
    }))

  return {
    kpis: {
      sentiment_index,
      volume,
      positive_pct: Math.round((positive / volume) * 100),
      negative_pct: Math.round((negative / volume) * 100),
      accounts_at_risk,
    },
    trend,
    by_account,
    by_source,
    top_pains: topTerms(painMap),
    top_praises: topTerms(praiseMap),
    quotes,
  }
}
