'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { motion } from 'framer-motion'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { Smile, Frown, ThumbsUp, MessageSquare, ChevronRight } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/section-header'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { useDateRange } from '@/hooks/useDateRange'
import { cn } from '@/lib/utils'
import type { PortfolioVoc, Polarity } from '@/lib/voc/portfolio-voc'
import { POLARITY_META, SOURCE_META, indexColor, dominantPolarity, fmtDate } from './voc-ui'
import { SignalsDrawer, type DrawerState } from './SignalsDrawer'

function TermList({ items, variant, onPick }: { items: Array<{ label: string; count: number }>; variant: 'pain' | 'praise'; onPick: (label: string) => void }) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center border border-dashed border-border-divider rounded-xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem temas no período</p>
      </div>
    )
  }
  const color = variant === 'pain' ? 'text-red-500' : 'text-emerald-500'
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={`${it.label}-${i}`}>
          <button onClick={() => onPick(it.label)} className="w-full flex justify-between items-center p-3 bg-surface-background rounded-xl border border-border-divider/50 hover:border-plannera-orange/40 hover:bg-surface-card transition-colors text-left">
            <span className="text-sm font-medium text-content-primary truncate">{it.label}</span>
            <span className={cn('text-xs font-extrabold tabular-nums', color)}>{it.count}x</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function VocPortfolioClient() {
  const { dateFrom, dateTo, label } = useDateRange('30d')
  const qs = `date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  // Ao abrir uma conta, herdar o filtro de data atual (period/from/to) da VOC geral.
  const searchParams = useSearchParams()
  const urlQs = searchParams.toString()
  const accountHref = (id: string) => `/voc/${id}${urlQs ? `?${urlQs}` : ''}`

  const { data, isLoading } = useQuery<PortfolioVoc>({
    queryKey: ['voc-portfolio', dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/voc/portfolio?${qs}`)
      return res.json()
    },
  })

  if (isLoading || !data) {
    return (
      <div className="space-y-6">
        <DateRangePicker />
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
          {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}
        </div>
        <Skeleton className="h-72 rounded-2xl" />
      </div>
    )
  }

  const { kpis, trend, by_account, by_source, top_pains, top_praises, quotes } = data

  return (
    <div className="space-y-8">
      <DateRangePicker />

      {/* KPIs — cada um abre os sinais que o compõem */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCardPremium title="Índice de Sentimento" value={kpis.sentiment_index} iconName="Activity" colorVariant={indexColor(kpis.sentiment_index)} status="-100 a +100"
          onClick={() => setDrawer({ kind: 'filter', title: 'Todos os sinais', subtitle: 'Compõem o índice de sentimento', filter: {} })} />
        <StatCardPremium title="Sinais Analisados" value={kpis.volume} iconName="MessageSquare" colorVariant="default" status={`Período: ${label}`}
          onClick={() => setDrawer({ kind: 'filter', title: 'Todos os sinais', filter: {} })} />
        <StatCardPremium title="% Positivo" value={kpis.positive_pct} suffix="%" iconName="ThumbsUp" colorVariant="emerald" status="Da voz captada"
          onClick={() => setDrawer({ kind: 'filter', title: 'Sinais positivos', filter: { polarity: 'positive' } })} />
        <StatCardPremium title="% Negativo" value={kpis.negative_pct} suffix="%" iconName="ThumbsDown" colorVariant="destructive" status="Da voz captada"
          onClick={() => setDrawer({ kind: 'filter', title: 'Sinais negativos', filter: { polarity: 'negative' } })} />
        <StatCardPremium title="Contas em Alerta" value={kpis.accounts_at_risk} iconName="AlertTriangle" colorVariant="demand" status="Sentimento negativo"
          onClick={() => setDrawer({ kind: 'filter', title: 'Voz negativa', subtitle: 'Sinais que puxam contas para o alerta', filter: { polarity: 'negative' } })} />
      </div>

      {/* Tendência — clique num dia abre os sinais daquele dia */}
      <div className="space-y-4">
        <SectionHeader title="Tendência de Sentimento" subtitle={`Média diária de todas as fontes — ${label} · clique num dia`} />
        <Card>
          <CardContent className="p-5">
            {trend.length === 0 ? (
              <div className="py-12 text-center">
                <MessageSquare className="w-6 h-6 text-content-secondary/40 mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem sinais no período</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height={280}>
                <AreaChart data={trend} onClick={(e: any) => { const d = e?.activeLabel; if (d) setDrawer({ kind: 'filter', title: `Sinais de ${fmtDate(String(d))}`, filter: { day: String(d) } }) }} style={{ cursor: 'pointer' }}>
                  <defs>
                    <linearGradient id="vocSentiment" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#f7941e" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#f7941e" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-divider/40" />
                  <XAxis dataKey="date" stroke="currentColor" className="text-content-secondary" fontSize={10} />
                  <YAxis domain={[-1, 1]} stroke="currentColor" className="text-content-secondary" fontSize={10} />
                  <Tooltip contentStyle={{ background: 'hsl(var(--surface-card))', border: '1px solid hsl(var(--border-divider))', borderRadius: 12, fontSize: 11 }} />
                  <Area type="monotone" dataKey="sentiment" stroke="#f7941e" fill="url(#vocSentiment)" strokeWidth={2} />
                </AreaChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Sentimento por conta + Distribuição por fonte */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        <div className="lg:col-span-2 space-y-4">
          <SectionHeader title="Sentimento por Conta" subtitle="Contas que precisam de atenção primeiro" />
          <Card>
            <CardContent className="p-3 space-y-2">
              {by_account.length === 0 ? (
                <div className="py-10 text-center">
                  <Smile className="w-6 h-6 text-content-secondary/40 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem sinais de voz no período</p>
                </div>
              ) : (
                by_account.map((a, i) => {
                  const pol = dominantPolarity(a)
                  const total = a.positive + a.neutral + a.negative
                  return (
                    <Link key={a.account_id} href={accountHref(a.account_id)} className="block group">
                      <motion.div
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: Math.min(i * 0.03, 0.4) }}
                        className="flex items-center gap-3 p-3 rounded-xl border border-border-divider hover:border-plannera-operations/40 hover:bg-surface-background transition-colors"
                      >
                        <div className={cn('p-2 rounded-lg shrink-0', POLARITY_META[pol].bg)}>
                          <span className="text-base leading-none">{POLARITY_META[pol].emoji}</span>
                        </div>
                        <div className="min-w-0 flex-1 space-y-1.5">
                          <div className="flex items-center gap-2">
                            <span className="text-[12px] font-black text-content-primary truncate">{a.name}</span>
                            {a.segment && (
                              <Badge className="bg-surface-background text-content-secondary border-none text-[8px] font-black uppercase tracking-tight h-4 px-1.5 shrink-0">{a.segment}</Badge>
                            )}
                            <Badge className="bg-surface-background text-content-secondary border-none text-[8px] font-black uppercase tracking-tight h-4 px-1.5 shrink-0">{a.volume} sinais</Badge>
                          </div>
                          <div className="flex h-1.5 w-full rounded-full overflow-hidden bg-surface-background">
                            {total > 0 && (['negative', 'neutral', 'positive'] as Polarity[]).map(p => a[p] > 0 && (
                              <div key={p} className={cn('h-full', POLARITY_META[p].dot)} style={{ width: `${(a[p] / total) * 100}%` }} title={`${POLARITY_META[p].label}: ${a[p]}`} />
                            ))}
                          </div>
                        </div>
                        <div className="text-right shrink-0">
                          <span className={cn('text-sm font-black', POLARITY_META[pol].text)}>{a.avg_score > 0 ? '+' : ''}{a.avg_score.toFixed(2)}</span>
                          <p className="text-[8px] font-bold uppercase tracking-widest text-content-secondary">Health {a.health_score}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-content-secondary/40 group-hover:text-content-secondary shrink-0" />
                      </motion.div>
                    </Link>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Distribuição por Fonte" subtitle="De onde vem a voz · clique para ver" />
          <Card>
            <CardContent className="p-5 space-y-4">
              {by_source.length === 0 ? (
                <div className="py-10 text-center">
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem fontes no período</p>
                </div>
              ) : (
                by_source.map(s => {
                  const Icon = SOURCE_META[s.source].icon
                  const total = s.positive + s.neutral + s.negative
                  return (
                    <button key={s.source} onClick={() => setDrawer({ kind: 'filter', title: `Fonte: ${SOURCE_META[s.source].label}`, filter: { source: s.source } })} className="w-full space-y-1.5 text-left group">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-content-primary group-hover:text-plannera-orange transition-colors">
                          <Icon className="w-3.5 h-3.5 text-content-secondary" /> {SOURCE_META[s.source].label}
                        </span>
                        <span className="text-[10px] font-bold text-content-secondary">{total}</span>
                      </div>
                      <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-background">
                        {(['negative', 'neutral', 'positive'] as Polarity[]).map(p => s[p] > 0 && (
                          <div key={p} className={cn('h-full', POLARITY_META[p].dot)} style={{ width: `${(s[p] / total) * 100}%` }} title={`${POLARITY_META[p].label}: ${s[p]}`} />
                        ))}
                      </div>
                    </button>
                  )
                })
              )}
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Top Dores / Elogios — clique num termo abre os sinais daquele tema */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-4">
          <SectionHeader title="Top Dores" subtitle="Temas de reuniões + tags/keywords (NPS/suporte) — sinais de dor" />
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <Frown className="w-4 h-4 text-red-500" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-content-primary">O que dói</h3>
            </div>
            <TermList items={top_pains} variant="pain" onPick={(t) => setDrawer({ kind: 'filter', title: `Dor: ${t}`, filter: { theme: t, theme_bucket: 'pain' } })} />
          </CardContent></Card>
        </div>
        <div className="space-y-4">
          <SectionHeader title="Top Elogios" subtitle="Temas de reuniões + tags/keywords (NPS/suporte) — sinais de encanto" />
          <Card><CardContent className="p-5">
            <div className="flex items-center gap-2 mb-4">
              <ThumbsUp className="w-4 h-4 text-emerald-500" />
              <h3 className="text-[11px] font-black uppercase tracking-widest text-content-primary">O que encanta</h3>
            </div>
            <TermList items={top_praises} variant="praise" onPick={(t) => setDrawer({ kind: 'filter', title: `Elogio: ${t}`, filter: { theme: t, theme_bucket: 'praise' } })} />
          </CardContent></Card>
        </div>
      </div>

      {/* Citações — clique abre a evidência (como foi avaliado) */}
      <div className="space-y-4">
        <SectionHeader title="Citações & Vozes" subtitle="Trechos reais · clique para ver a evidência" />
        <Card>
          <CardContent className="p-5">
            {quotes.length === 0 ? (
              <div className="py-10 text-center">
                <MessageSquare className="w-6 h-6 text-content-secondary/40 mx-auto mb-2" />
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem citações no período</p>
              </div>
            ) : (
              <div className="space-y-3 max-h-[28rem] overflow-y-auto pr-2 custom-scrollbar">
                {quotes.map((q) => (
                  <button key={q.id} onClick={() => setDrawer({ kind: 'signal', signal: q })} className="w-full text-left group">
                    <div className="flex items-start gap-4 p-4 bg-surface-background rounded-xl border border-border-divider hover:bg-surface-card transition-colors">
                      <div className={cn('w-10 h-10 rounded-xl flex items-center justify-center shrink-0', POLARITY_META[q.polarity].bg)}>
                        <span className="text-xl">{POLARITY_META[q.polarity].emoji}</span>
                      </div>
                      <div className="flex-1 min-w-0 space-y-1">
                        <p className="text-sm text-content-primary font-medium leading-relaxed line-clamp-3">&quot;{q.excerpt}&quot;</p>
                        <p className="text-[10px] font-bold text-content-secondary uppercase tracking-widest opacity-70">
                          {q.account_name} · {SOURCE_META[q.source].label} · {fmtDate(q.date)}
                        </p>
                      </div>
                      <ChevronRight className="w-4 h-4 text-content-secondary/40 group-hover:text-content-secondary shrink-0 mt-1" />
                    </div>
                  </button>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <SignalsDrawer state={drawer} onClose={() => setDrawer(null)} dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  )
}
