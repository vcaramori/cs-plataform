'use client'

import { useEffect, useState } from 'react'
import { TrendingUp, TrendingDown, Minus } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Deltas {
  new_accounts_current: number
  new_accounts_prior: number
  mrr_delta_pct: number | null
  nps_delta: number | null
}

function DeltaBadge({ value, unit = '', invertPositive = false }: {
  value: number | null
  unit?: string
  invertPositive?: boolean
}) {
  if (value === null) return <span className="text-[9px] font-black text-content-secondary/40">—</span>
  const isPositive = invertPositive ? value < 0 : value > 0
  const isNeutral = value === 0

  return (
    <div className={cn(
      'flex items-center gap-1 text-[9px] font-black px-2 py-0.5 rounded-full border',
      isNeutral
        ? 'text-content-secondary border-border-divider bg-surface-background'
        : isPositive
          ? 'text-emerald-600 border-emerald-500/20 bg-emerald-500/10'
          : 'text-red-600 border-red-500/20 bg-red-500/10'
    )}>
      {isNeutral ? (
        <Minus className="w-2.5 h-2.5" />
      ) : isPositive ? (
        <TrendingUp className="w-2.5 h-2.5" />
      ) : (
        <TrendingDown className="w-2.5 h-2.5" />
      )}
      <span>{value > 0 ? '+' : ''}{value}{unit}</span>
    </div>
  )
}

export function KPIDeltas() {
  const [deltas, setDeltas] = useState<Deltas | null>(null)

  useEffect(() => {
    fetch('/api/dashboard/kpi-deltas')
      .then(r => r.ok ? r.json() : null)
      .then(data => data && setDeltas(data))
      .catch(() => null)
  }, [])

  if (!deltas) return null

  const accountsDelta = deltas.new_accounts_current - deltas.new_accounts_prior

  return (
    <div className="flex flex-wrap items-center gap-3 px-4 py-2 bg-surface-card/50 border border-border-divider rounded-2xl text-[10px] text-content-secondary">
      <span className="font-black uppercase tracking-widest opacity-50">vs 30d anteriores</span>

      <div className="flex items-center gap-1.5">
        <span className="opacity-60">Novos logos</span>
        <DeltaBadge value={accountsDelta} />
      </div>

      <div className="w-px h-4 bg-border-divider" />

      <div className="flex items-center gap-1.5">
        <span className="opacity-60">MRR</span>
        <DeltaBadge value={deltas.mrr_delta_pct} unit="%" />
      </div>

      <div className="w-px h-4 bg-border-divider" />

      <div className="flex items-center gap-1.5">
        <span className="opacity-60">NPS</span>
        <DeltaBadge value={deltas.nps_delta} unit=" pts" />
      </div>
    </div>
  )
}
