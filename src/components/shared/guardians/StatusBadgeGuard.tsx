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
  size?: 'default' | 'sm'
}

export function StatusBadgeGuard({
  label,
  icon: IconProp,
  iconName,
  type = 'info',
  className,
  size = 'default'
}: StatusBadgeGuardProps) {
  
  const Icon = iconName ? (Icons[iconName] as LucideIcon) : IconProp

  const styles: Record<BadgeType, string> = {
    promoter: 'text-success bg-success/10 border-success-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    success: 'text-success bg-success/10 border-success-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    resolved: 'text-success bg-success/10 border-success-500/20 shadow-[0_0_8px_rgba(16,185,129,0.1)]',
    
    neutral: 'text-warning bg-warning/10 border-warning-500/20',
    warning: 'text-warning bg-warning/10 border-warning-500/20',
    high: 'text-warning bg-warning/10 border-warning-500/20',
    'in-progress': 'text-warning bg-warning/10 border-warning-500/20',
    
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
      "inline-flex items-center gap-1.5 border shadow-sm transition-all",
      size === 'sm'
        ? "px-2 py-0.5 rounded-md text-[9px] font-bold uppercase tracking-wider"
        : "px-3 py-1.5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest hover:scale-105",
      styles[type],
      className
    )}>
      {Icon && <Icon className={size === 'sm' ? "w-3 h-3" : "w-3.5 h-3.5"} />}
      {label}
    </div>
  )
}
