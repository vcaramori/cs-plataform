'use client'

import * as Icons from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

type BadgeType = 
  | 'promoter' | 'neutral' | 'detractor' 
  | 'ai' | 'warning' | 'success' | 'info' 
  | 'critical' | 'high' | 'medium' | 'low'
  | 'open' | 'resolved' | 'closed' | 'in-progress'

interface StatusBadgeGuardProps {
  label: string
  icon?: LucideIcon
  iconName?: keyof typeof Icons
  type?: BadgeType
  className?: string
}

export function StatusBadgeGuard({
  label,
  icon: IconProp,
  iconName,
  type = 'info',
  className
}: StatusBadgeGuardProps) {
  
  const Icon = iconName ? (Icons[iconName] as LucideIcon) : IconProp

  const styles: Record<BadgeType, string> = {
    promoter: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    success: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    resolved: 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    
    neutral: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    warning: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    high: 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    'in-progress': 'text-amber-500 bg-amber-500/10 border-amber-500/20',
    
    detractor: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]',
    critical: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]',
    open: 'text-rose-500 bg-rose-500/10 border-rose-500/20 shadow-[0_0_8px_rgba(244,63,94,0.1)]',
    
    ai: 'text-plannera-ds bg-plannera-ds/10 border-plannera-ds/20',
    
    info: 'text-plannera-sop bg-plannera-sop/10 border-plannera-sop/20',
    medium: 'text-plannera-sop bg-plannera-sop/10 border-plannera-sop/20',
    
    low: 'text-content-secondary bg-surface-card border-border-divider',
    closed: 'text-content-secondary bg-surface-card border-border-divider'
  }

  return (
    <div className={cn(
      "flex items-center gap-2 px-3 py-1.5 rounded-xl border text-[10px] font-extrabold uppercase tracking-widest shadow-sm transition-all hover:scale-105",
      styles[type],
      className
    )}>
      {Icon && <Icon className="w-3.5 h-3.5" />}
      {label}
    </div>
  )
}
