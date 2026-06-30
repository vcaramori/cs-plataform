'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { ChevronDown, CalendarRange, Users, Star } from 'lucide-react'
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from '@/components/ui/sheet'
import { Skeleton } from '@/components/ui/skeleton'
import { cn } from '@/lib/utils'
import { calculateDateRange, type DateRangePeriod } from '@/lib/date-range'
import type { VocSignal, VocStakeholder } from '@/lib/voc/portfolio-voc'
import { POLARITY_META, SOURCE_META, fmtDate, asQuote } from './voc-ui'
import { SignalEvidence } from './SignalEvidence'

// Presets do filtro de data local do drawer ('' = herda o período da tela).
const DRAWER_PERIODS: Array<[string, string]> = [
  ['', 'Período da tela'], ['today', 'Hoje'], ['wtd', 'Esta semana'], ['7d', '7 dias'], ['30d', '30 dias'],
  ['90d', '90 dias'], ['mtd', 'Mês atual'], ['qtd', 'Trimestre'], ['ytd', 'Ano'],
]

export type DrawerState =
  | { kind: 'filter'; title: string; subtitle?: string; filter: Record<string, string> }
  | { kind: 'signal'; signal: VocSignal }

/** Chips compactos de stakeholders do cliente (casados com o Power Map). */
function StakeholderChips({ stakeholders }: { stakeholders: VocStakeholder[] }) {
  // Stakeholders do CLIENTE (não internos), Power Map primeiro; máximo 3 no 1º nível.
  const client = stakeholders.filter((s) => !s.is_internal)
  if (client.length === 0) return null
  const shown = client.slice(0, 3)
  const extra = client.length - shown.length
  return (
    <div className="flex flex-wrap items-center gap-1 pt-0.5">
      <Users className="w-3 h-3 text-content-secondary/60 shrink-0" />
      {shown.map((s, i) => (
        <span
          key={i}
          className={cn(
            'inline-flex items-center gap-0.5 text-[9px] font-bold rounded-md px-1.5 py-0.5',
            s.in_power_map ? 'bg-plannera-primary/10 text-plannera-primary' : 'bg-surface-background text-content-secondary'
          )}
          title={s.in_power_map ? 'Casado com o Power Map' : 'Participante (fora do Power Map)'}
        >
          {s.decision_maker && <Star className="w-2.5 h-2.5 fill-current" />}
          {s.name}{s.role ? ` · ${s.role}` : ''}
        </span>
      ))}
      {extra > 0 && <span className="text-[9px] font-bold text-content-secondary/60">+{extra}</span>}
    </div>
  )
}

function SignalRow({ signal }: { signal: VocSignal }) {
  const [open, setOpen] = useState(false)
  const pol = POLARITY_META[signal.polarity]
  const meta = (signal.evidence.meta ?? {}) as Record<string, any>
  const quote = Array.isArray(meta.quotes) && meta.quotes.length ? asQuote(meta.quotes[0]) : null
  const stakeholders: VocStakeholder[] = Array.isArray(meta.stakeholders) ? meta.stakeholders : []
  const explain = quote?.q || signal.excerpt || signal.evidence.title || '—'
  return (
    <li className="rounded-xl border border-border-divider bg-surface-background overflow-hidden">
      <button onClick={() => setOpen((o) => !o)} className="w-full flex items-start gap-3 p-3 text-left hover:bg-surface-card transition-colors">
        <div className={cn('p-1.5 rounded-lg shrink-0', pol.bg)}>
          <span className="text-sm leading-none">{pol.emoji}</span>
        </div>
        <div className="min-w-0 flex-1 space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[12px] font-black text-content-primary truncate">{signal.account_name}</span>
            <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary shrink-0">{SOURCE_META[signal.source].label}</span>
          </div>
          {/* Explicação em 3ª pessoa */}
          <p className="text-xs text-content-secondary leading-relaxed line-clamp-2">{explain}</p>
          {/* Citação literal (verbatim), quando houver */}
          {quote?.lit && (
            <p className="text-xs text-content-primary italic leading-relaxed line-clamp-2 border-l-2 border-plannera-primary/40 pl-2">“{quote.lit}”</p>
          )}
          {quote?.by && <span className="block text-[10px] font-bold text-plannera-orange">— {quote.by}</span>}
          <StakeholderChips stakeholders={stakeholders} />
          <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary/70">{fmtDate(signal.date)}</span>
        </div>
        <ChevronDown className={cn('w-4 h-4 text-content-secondary/50 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {open && (
        <div className="p-3 border-t border-border-divider bg-surface-card">
          <SignalEvidence signal={signal} />
        </div>
      )}
    </li>
  )
}

export function SignalsDrawer({
  state,
  onClose,
  dateFrom,
  dateTo,
}: {
  state: DrawerState | null
  onClose: () => void
  dateFrom: string
  dateTo: string
}) {
  const isFilter = state?.kind === 'filter'
  const filter = isFilter ? state.filter : null

  // Filtro de data LOCAL do drawer: sobrepõe o período herdado da tela quando definido.
  const [localPeriod, setLocalPeriod] = useState<DateRangePeriod | ''>('')
  useEffect(() => { setLocalPeriod('') }, [state])
  const localRange = localPeriod ? calculateDateRange(localPeriod) : null
  const effFrom = localRange ? localRange.from.toISOString() : dateFrom
  const effTo = localRange ? localRange.to.toISOString() : dateTo

  const { data, isLoading } = useQuery<{ signals: VocSignal[]; total: number }>({
    queryKey: ['voc-signals', effFrom, effTo, filter],
    enabled: isFilter,
    queryFn: async () => {
      const params = new URLSearchParams({ date_from: effFrom, date_to: effTo, ...(filter ?? {}) })
      const res = await fetch(`/api/voc/signals?${params.toString()}`)
      return res.json()
    },
  })

  return (
    <Sheet open={!!state} onOpenChange={(o) => { if (!o) onClose() }}>
      <SheetContent side="right" className="w-full sm:max-w-lg overflow-y-auto custom-scrollbar">
        {state?.kind === 'signal' ? (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>Detalhe do sinal</SheetTitle>
              <SheetDescription>Origem, nota e texto que geraram este sentimento.</SheetDescription>
            </SheetHeader>
            <SignalEvidence signal={state.signal} />
          </>
        ) : (
          <>
            <SheetHeader className="mb-4">
              <SheetTitle>{state?.kind === 'filter' ? state.title : 'Sinais'}</SheetTitle>
              <SheetDescription>
                {isFilter && state.subtitle ? state.subtitle : 'Sinais que compõem este número. Clique para ver como foi avaliado.'}
                {data ? ` · ${data.total} no período` : ''}
              </SheetDescription>
            </SheetHeader>

            {/* Filtro de data local */}
            <div className="flex items-center gap-2 mb-4">
              <CalendarRange className="w-3.5 h-3.5 text-content-secondary shrink-0" />
              <select
                value={localPeriod}
                onChange={(e) => setLocalPeriod(e.target.value as DateRangePeriod | '')}
                className="text-[11px] font-bold px-2 py-1.5 rounded-lg bg-surface-card border border-border-divider text-content-primary focus:outline-none focus:ring-1 focus:ring-plannera-primary/30"
              >
                {DRAWER_PERIODS.map(([v, l]) => <option key={v} value={v}>{l}</option>)}
              </select>
              {localRange && <span className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">{localRange.label}</span>}
            </div>
            {isLoading ? (
              <div className="space-y-2">{Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}</div>
            ) : !data || data.signals.length === 0 ? (
              <div className="py-16 text-center">
                <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Nenhum sinal aqui no período</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {data.signals.map((s) => <SignalRow key={s.id} signal={s} />)}
                {data.total > data.signals.length && (
                  <li className="text-center py-2 text-[10px] font-bold uppercase tracking-widest text-content-secondary/70">
                    Mostrando {data.signals.length} de {data.total}
                  </li>
                )}
              </ul>
            )}
          </>
        )}
      </SheetContent>
    </Sheet>
  )
}
