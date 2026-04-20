'use client'

import { cn } from '@/lib/utils'

type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened'

const STEPS: { key: TicketStatus | 'in_progress'; label: string }[] = [
  { key: 'open',       label: 'Aberto' },
  { key: 'in_progress', label: 'Em andamento' },
  { key: 'resolved',   label: 'Resolvido' },
  { key: 'closed',     label: 'Fechado' },
]

const ORDER: Record<TicketStatus, number> = {
  open: 0,
  in_progress: 1,
  reopened: 1,
  resolved: 2,
  closed: 3,
}

interface TicketLifecycleBarProps {
  status: TicketStatus
  className?: string
}

export function TicketLifecycleBar({ status, className }: TicketLifecycleBarProps) {
  const currentIndex = ORDER[status] ?? 0
  const isReopened = status === 'reopened'

  return (
    <div className={cn('flex items-center gap-0', className)}>
      {STEPS.map((step, i) => {
        const isDone = i < currentIndex
        const isCurrent = i === currentIndex

        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center gap-1">
              <div className={cn(
                'w-2.5 h-2.5 rounded-full border-2 transition-colors',
                isDone ? 'bg-emerald-500 border-emerald-500' :
                isCurrent ? (isReopened ? 'bg-amber-500 border-amber-500' : 'bg-indigo-400 border-indigo-400') :
                'bg-transparent border-slate-600'
              )} />
              <span className={cn(
                'text-[10px] whitespace-nowrap',
                isDone ? 'text-emerald-400' :
                isCurrent ? 'text-white font-semibold' : 'text-slate-600'
              )}>
                {isCurrent && isReopened && step.key === 'in_progress' ? 'Reaberto' : step.label}
              </span>
            </div>
            {i < STEPS.length - 1 && (
              <div className={cn(
                'h-px w-8 mb-3 mx-1',
                i < currentIndex ? 'bg-emerald-500' : 'bg-slate-700'
              )} />
            )}
          </div>
        )
      })}
    </div>
  )
}
