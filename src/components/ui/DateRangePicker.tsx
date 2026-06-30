'use client'

import { useState } from 'react'
import { useDateRange, DateRangePeriod } from '@/hooks/useDateRange'
import { Button } from './button'
import { CalendarRange, SlidersHorizontal } from 'lucide-react'
import { toDateStr } from '@/lib/date-range'

interface DateRangePickerProps {
  onPeriodChange?: (period: DateRangePeriod) => void
  defaultPeriod?: DateRangePeriod
}

// Presets calendário (MTD/QTD/YTD = início do mês/trimestre/ano) + rolling + esta semana.
const PERIODS: { value: DateRangePeriod; label: string }[] = [
  { value: 'today', label: 'Hoje' },
  { value: 'wtd', label: 'Esta semana' },
  { value: '7d', label: '7 dias' },
  { value: '30d', label: '30 dias' },
  { value: '90d', label: '90 dias' },
  { value: 'mtd', label: 'MTD' },
  { value: 'last_month', label: 'Mês anterior' },
  { value: 'qtd', label: 'QTD' },
  { value: 'ytd', label: 'YTD' },
  { value: 'last_year', label: 'Ano anterior' },
]

export function DateRangePicker({ onPeriodChange, defaultPeriod = '30d' }: DateRangePickerProps) {
  const { period, setPeriod, from, to } = useDateRange(defaultPeriod)
  const [showCustom, setShowCustom] = useState(period === 'custom')
  const [cFrom, setCFrom] = useState(toDateStr(from))
  const [cTo, setCTo] = useState(toDateStr(to))

  const pick = (p: DateRangePeriod) => {
    setShowCustom(false)
    setPeriod(p)
    onPeriodChange?.(p)
  }

  const applyCustom = () => {
    if (!cFrom || !cTo) return
    const f = new Date(`${cFrom}T00:00:00`)
    const t = new Date(`${cTo}T23:59:59`)
    if (isNaN(f.getTime()) || isNaN(t.getTime()) || f > t) return
    setPeriod('custom', f, t)
    onPeriodChange?.('custom')
  }

  return (
    <div className="flex flex-col gap-2 p-2 bg-surface-card rounded-lg border border-border-divider">
      <div className="flex items-center gap-2">
        <CalendarRange className="w-4 h-4 text-content-secondary shrink-0" />
        <div className="flex flex-wrap gap-1">
          {PERIODS.map((p) => (
            <Button
              key={p.value}
              variant={period === p.value && !showCustom ? 'default' : 'outline'}
              size="sm"
              onClick={() => pick(p.value)}
              className="text-xs"
            >
              {p.label}
            </Button>
          ))}
          <Button
            variant={period === 'custom' || showCustom ? 'default' : 'outline'}
            size="sm"
            onClick={() => setShowCustom((s) => !s)}
            className="text-xs inline-flex items-center gap-1"
          >
            <SlidersHorizontal className="w-3 h-3" /> Personalizado
          </Button>
        </div>
      </div>

      {(showCustom || period === 'custom') && (
        <div className="flex flex-wrap items-center gap-2 pl-6">
          <label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">De</label>
          <input
            type="date"
            value={cFrom}
            max={cTo || undefined}
            onChange={(e) => setCFrom(e.target.value)}
            className="text-xs px-2 py-1 rounded-md bg-surface-background border border-border-divider text-content-primary focus:outline-none focus:ring-1 focus:ring-plannera-primary/30"
          />
          <label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary">Até</label>
          <input
            type="date"
            value={cTo}
            min={cFrom || undefined}
            onChange={(e) => setCTo(e.target.value)}
            className="text-xs px-2 py-1 rounded-md bg-surface-background border border-border-divider text-content-primary focus:outline-none focus:ring-1 focus:ring-plannera-primary/30"
          />
          <Button size="sm" onClick={applyCustom} className="text-xs">Aplicar</Button>
        </div>
      )}
    </div>
  )
}
