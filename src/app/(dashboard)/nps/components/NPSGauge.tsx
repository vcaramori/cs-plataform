'use client'

import { cn } from '@/lib/utils'

interface NPSGaugeProps {
  score: number
  goal: number | null
}

export function NPSGauge({ score, goal }: NPSGaugeProps) {
  const g = goal ?? 75
  const c = Math.max(-100, Math.min(100, score))
  const isMet = c >= g
  const color = isMet ? 'text-success' : 'text-destructive'
  const label = isMet ? 'Meta Atingida' : 'Abaixo da Meta'

  return (
    <div className="flex flex-col items-center gap-1 group relative">
      <div className={`text-6xl font-extrabold tracking-tighter ${color} transition-transform group-hover:scale-105 duration-300`}>
        {c > 0 ? '+' : ''}{c}
      </div>
      <div className="flex items-center gap-1 px-3 py-1 rounded-full text-[9px] font-extrabold uppercase tracking-widest bg-surface-card border border-border-divider shadow-sm">
        <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", isMet ? "bg-success" : "bg-destructive")} />
        <span className={isMet ? 'text-success' : 'text-destructive'}>{label}</span>
      </div>
      <div className="label-premium mt-4 flex items-center gap-2">
        <span>NPS SCORE</span>
        <span className="opacity-20">/</span>
        <span className="text-foreground">META: {g}</span>
      </div>
    </div>
  )
}
