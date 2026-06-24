'use client'

import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import { ArrowLeft, MessageSquare, Frown, ThumbsUp, ChevronRight, ExternalLink } from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import { SectionHeader } from '@/components/ui/section-header'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import { useDateRange } from '@/hooks/useDateRange'
import { cn } from '@/lib/utils'
import type { AccountVocResult, Polarity } from '@/lib/voc/portfolio-voc'
import { POLARITY_META, SOURCE_META, indexColor, fmtDate } from '../components/voc-ui'
import { SignalsDrawer, type DrawerState } from '../components/SignalsDrawer'

function TermList({ items, variant, onPick }: { items: Array<{ label: string; count: number }>; variant: 'pain' | 'praise'; onPick: (label: string) => void }) {
  if (items.length === 0) {
    return <div className="py-5 text-center border border-dashed border-border-divider rounded-xl"><p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem temas no período</p></div>
  }
  const color = variant === 'pain' ? 'text-red-500' : 'text-emerald-500'
  return (
    <ul className="space-y-2">
      {items.map((it, i) => (
        <li key={`${it.label}-${i}`}>
          <button onClick={() => onPick(it.label)} className="w-full flex justify-between items-center p-3 bg-surface-background rounded-xl border border-border-divider/50 hover:border-plannera-orange/40 transition-colors text-left">
            <span className="text-sm font-medium text-content-primary truncate">{it.label}</span>
            <span className={cn('text-xs font-extrabold tabular-nums', color)}>{it.count}x</span>
          </button>
        </li>
      ))}
    </ul>
  )
}

export default function VocAccountClient({ accountId }: { accountId: string }) {
  const { dateFrom, dateTo, label } = useDateRange('90d')
  const [drawer, setDrawer] = useState<DrawerState | null>(null)
  const qs = `date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`
  // Preserva o filtro de data ao voltar para o portfólio.
  const searchParams = useSearchParams()
  const urlQs = searchParams.toString()
  const portfolioHref = `/voc${urlQs ? `?${urlQs}` : ''}`

  const { data, isLoading } = useQuery<AccountVocResult>({
    queryKey: ['voc-account', accountId, dateFrom, dateTo],
    queryFn: async () => {
      const res = await fetch(`/api/voc/account/${accountId}?${qs}`)
      return res.json()
    },
  })

  const open = (title: string, filter: Record<string, string>) => setDrawer({ kind: 'filter', title, filter: { account_id: accountId, ...filter } })

  return (
    <div className="space-y-6">
      <Link href={portfolioHref} className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-content-secondary hover:text-content-primary transition-colors">
        <ArrowLeft className="w-3.5 h-3.5" /> Voltar ao portfólio
      </Link>

      <DateRangePicker />

      {isLoading || !data ? (
        <div className="space-y-4">
          <Skeleton className="h-20 rounded-2xl" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">{Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-2xl" />)}</div>
          <Skeleton className="h-72 rounded-2xl" />
        </div>
      ) : (
        <>
          {/* Cabeçalho da conta */}
          <Card>
            <CardContent className="p-5 flex flex-wrap items-center justify-between gap-3">
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="text-xl font-black text-content-primary">{data.account.name}</h2>
                  {data.account.segment && <Badge className="bg-surface-background text-content-secondary border-none text-[9px] font-black uppercase tracking-tight">{data.account.segment}</Badge>}
                </div>
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">Voz do cliente · {label}</p>
              </div>
              <div className="flex items-center gap-5">
                <div className="text-right">
                  <p className="text-[9px] font-bold uppercase tracking-widest text-content-secondary">Health</p>
                  <p className="text-2xl font-black text-content-primary tabular-nums leading-none">{data.account.health_score}</p>
                </div>
                <Link href={`/accounts/${accountId}`} className="inline-flex items-center gap-1 text-[11px] font-bold text-plannera-primary hover:underline">
                  Timeline completa <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            </CardContent>
          </Card>

          {/* KPIs */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            <StatCardPremium title="Índice de Sentimento" value={data.kpis.sentiment_index} iconName="Activity" colorVariant={indexColor(data.kpis.sentiment_index)} status="-100 a +100" onClick={() => open('Todos os sinais da conta', {})} />
            <StatCardPremium title="Sinais" value={data.kpis.volume} iconName="MessageSquare" colorVariant="default" status={`Período: ${label}`} onClick={() => open('Todos os sinais da conta', {})} />
            <StatCardPremium title="% Positivo" value={data.kpis.positive_pct} suffix="%" iconName="ThumbsUp" colorVariant="emerald" status="Da voz captada" onClick={() => open('Sinais positivos', { polarity: 'positive' })} />
            <StatCardPremium title="% Negativo" value={data.kpis.negative_pct} suffix="%" iconName="ThumbsDown" colorVariant="destructive" status="Da voz captada" onClick={() => open('Sinais negativos', { polarity: 'negative' })} />
          </div>

          {/* Tendência */}
          <div className="space-y-3">
            <SectionHeader title="Tendência de Sentimento" subtitle="Média diária · clique num dia" />
            <Card><CardContent className="p-5">
              {data.trend.length === 0 ? (
                <div className="py-12 text-center"><MessageSquare className="w-6 h-6 text-content-secondary/40 mx-auto mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem sinais no período</p></div>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <AreaChart data={data.trend} onClick={(e: any) => { const d = e?.activeLabel; if (d) open(`Sinais de ${fmtDate(String(d))}`, { day: String(d) }) }} style={{ cursor: 'pointer' }}>
                    <defs><linearGradient id="vocAcc" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#f7941e" stopOpacity={0.3} /><stop offset="95%" stopColor="#f7941e" stopOpacity={0} /></linearGradient></defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-border-divider/40" />
                    <XAxis dataKey="date" stroke="currentColor" className="text-content-secondary" fontSize={10} />
                    <YAxis domain={[-1, 1]} stroke="currentColor" className="text-content-secondary" fontSize={10} />
                    <Tooltip contentStyle={{ background: 'hsl(var(--surface-card))', border: '1px solid hsl(var(--border-divider))', borderRadius: 12, fontSize: 11 }} />
                    <Area type="monotone" dataKey="sentiment" stroke="#f7941e" fill="url(#vocAcc)" strokeWidth={2} />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </CardContent></Card>
          </div>

          {/* Distribuição por fonte + Dores/Elogios */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
            <Card><CardContent className="p-5 space-y-4">
              <h3 className="text-[11px] font-black uppercase tracking-widest text-content-primary">Por fonte</h3>
              {data.by_source.length === 0 ? <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem fontes</p> : data.by_source.map(s => {
                const Icon = SOURCE_META[s.source].icon
                const total = s.positive + s.neutral + s.negative
                return (
                  <button key={s.source} onClick={() => open(`Fonte: ${SOURCE_META[s.source].label}`, { source: s.source })} className="w-full space-y-1.5 text-left group">
                    <div className="flex items-center justify-between">
                      <span className="flex items-center gap-1.5 text-[11px] font-black uppercase tracking-widest text-content-primary group-hover:text-plannera-orange transition-colors"><Icon className="w-3.5 h-3.5 text-content-secondary" /> {SOURCE_META[s.source].label}</span>
                      <span className="text-[10px] font-bold text-content-secondary">{total}</span>
                    </div>
                    <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-background">
                      {(['negative', 'neutral', 'positive'] as Polarity[]).map(p => s[p] > 0 && <div key={p} className={cn('h-full', POLARITY_META[p].dot)} style={{ width: `${(s[p] / total) * 100}%` }} />)}
                    </div>
                  </button>
                )
              })}
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3"><Frown className="w-4 h-4 text-red-500" /><h3 className="text-[11px] font-black uppercase tracking-widest text-content-primary">O que dói</h3></div>
              <TermList items={data.top_pains} variant="pain" onPick={(t) => open(`Dor: ${t}`, { theme: t, polarity: 'negative' })} />
            </CardContent></Card>
            <Card><CardContent className="p-5">
              <div className="flex items-center gap-2 mb-3"><ThumbsUp className="w-4 h-4 text-emerald-500" /><h3 className="text-[11px] font-black uppercase tracking-widest text-content-primary">O que encanta</h3></div>
              <TermList items={data.top_praises} variant="praise" onPick={(t) => open(`Elogio: ${t}`, { theme: t, polarity: 'positive' })} />
            </CardContent></Card>
          </div>

          {/* Feed de sinais */}
          <div className="space-y-3">
            <SectionHeader title="Feed de Sinais" subtitle="Tudo que o cliente disse · clique para ver a evidência" />
            <Card><CardContent className="p-4">
              {data.signals.length === 0 ? (
                <div className="py-10 text-center"><MessageSquare className="w-6 h-6 text-content-secondary/40 mx-auto mb-2" /><p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Sem sinais no período</p></div>
              ) : (
                <div className="space-y-2 max-h-[32rem] overflow-y-auto pr-2 custom-scrollbar">
                  {data.signals.map((s) => {
                    const pol = POLARITY_META[s.polarity]
                    return (
                      <button key={s.id} onClick={() => setDrawer({ kind: 'signal', signal: s })} className="w-full text-left group">
                        <div className="flex items-start gap-3 p-3 bg-surface-background rounded-xl border border-border-divider hover:bg-surface-card transition-colors">
                          <div className={cn('p-1.5 rounded-lg shrink-0', pol.bg)}><span className="text-sm leading-none">{pol.emoji}</span></div>
                          <div className="flex-1 min-w-0 space-y-0.5">
                            <div className="flex items-center gap-2">
                              <span className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">{SOURCE_META[s.source].label}</span>
                              <span className={cn('text-[11px] font-black', pol.text)}>{s.score > 0 ? '+' : ''}{s.score.toFixed(2)}</span>
                            </div>
                            <p className="text-xs text-content-primary line-clamp-2">{s.excerpt ?? s.evidence.title ?? '—'}</p>
                            <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary/70">{fmtDate(s.date)}</span>
                          </div>
                          <ChevronRight className="w-4 h-4 text-content-secondary/40 group-hover:text-content-secondary shrink-0 mt-1" />
                        </div>
                      </button>
                    )
                  })}
                </div>
              )}
            </CardContent></Card>
          </div>
        </>
      )}

      <SignalsDrawer state={drawer} onClose={() => setDrawer(null)} dateFrom={dateFrom} dateTo={dateTo} />
    </div>
  )
}
