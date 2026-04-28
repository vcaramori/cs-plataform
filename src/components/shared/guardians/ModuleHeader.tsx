'use client'

import * as Icons from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ModuleHeaderProps {
  title: string
  subtitle?: string
  iconName?: keyof typeof Icons
  children?: React.ReactNode
  className?: string
}

export function ModuleHeader({
  title,
  subtitle,
  iconName,
  children,
  className
}: ModuleHeaderProps) {
  const Icon = iconName ? (Icons[iconName] as LucideIcon) : null

  return (
    <div className={cn("flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-12", className)}>
      <div className="space-y-2">
        <div className="flex items-center gap-3">
          {Icon && (
            <div className="w-12 h-12 rounded-2xl bg-plannera-primary/10 border border-plannera-primary/20 flex items-center justify-center shadow-inner">
              <Icon className="w-6 h-6 text-plannera-primary" />
            </div>
          )}
          <h1 className="h1-page">{title}</h1>
        </div>
        {subtitle && <p className="label-premium">{subtitle}</p>}
      </div>
      
      {children && (
        <div className="flex items-center gap-3">
          {children}
        </div>
      )}
    </div>
  )
}
