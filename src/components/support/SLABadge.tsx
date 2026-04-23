'use client'

import { cn } from '@/lib/utils'
import { Clock, AlertTriangle, CheckCircle2, XCircle } from 'lucide-react'

type SLAStatus = 'no_prazo' | 'atencao' | 'vencido' | 'cumprido' | 'violado'

interface SLABadgeProps {
  status: SLAStatus | null
  label?: string
  className?: string
}

const config: Record<SLAStatus, { bg: string; text: string; icon: React.ComponentType<any> }> = {
  no_prazo:  { bg: 'bg-emerald-500/10 border-emerald-500/30', text: 'text-emerald-400', icon: Clock },
  atencao:   { bg: 'bg-amber-500/10 border-amber-500/30',    text: 'text-amber-400',   icon: AlertTriangle },
  vencido:   { bg: 'bg-red-500/10 border-red-500/30',        text: 'text-red-400',      icon: XCircle },
  cumprido:  { bg: 'bg-sky-500/10 border-sky-500/30',        text: 'text-sky-400',      icon: CheckCircle2 },
  violado:   { bg: 'bg-red-700/10 border-red-700/30',        text: 'text-red-500',      icon: XCircle },
}

const labels: Record<SLAStatus, string> = {
  no_prazo:  'No Prazo',
  atencao:   'Atenção',
  vencido:   'Vencido',
  cumprido:  'Cumprido',
  violado:   'Violado',
}

export function SLABadge({ status, label, className }: SLABadgeProps) {
  if (!status) return null

  const { bg, text, icon: Icon } = config[status]

  return (
    <span className={cn(
      'inline-flex items-center gap-1 px-3 py-1 rounded-full border text-[10px] font-extrabold uppercase tracking-widest',
      bg, text, className
    )}>
      <Icon className="w-3 h-3" />
      {label ?? labels[status]}
    </span>
  )
}

