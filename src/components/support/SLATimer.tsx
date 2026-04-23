'use client'

import { useEffect, useState } from 'react'
import { cn } from '@/lib/utils'

interface SLATimerProps {
  deadline: string | null
  resolvedAt?: string | null
  className?: string
}

function formatRemaining(ms: number): string {
  if (ms <= 0) return 'Vencido'
  const totalMinutes = Math.floor(ms / 60000)
  const hours = Math.floor(totalMinutes / 60)
  const minutes = totalMinutes % 60
  if (hours > 48) return `${Math.floor(hours / 24)}d`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

export function SLATimer({ deadline, resolvedAt, className }: SLATimerProps) {
  const [remaining, setRemaining] = useState<number | null>(null)

  useEffect(() => {
    if (!deadline || resolvedAt) return

    const tick = () => {
      const diff = new Date(deadline).getTime() - Date.now()
      setRemaining(diff)
    }

    tick()
    const interval = setInterval(tick, 60000)
    return () => clearInterval(interval)
  }, [deadline, resolvedAt])

  if (!deadline) return null
  if (resolvedAt) return <span className={cn('text-xs text-slate-500', className)}>Resolvido</span>
  if (remaining === null) return null

  const isUrgent = remaining <= 0

  return (
    <span className={cn(
      'text-xs font-mono font-bold tabular-nums',
      isUrgent ? 'text-red-400' : remaining < 3600000 ? 'text-amber-400' : 'text-emerald-400',
      className
    )}>
      {formatRemaining(remaining)}
    </span>
  )
}

