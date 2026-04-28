'use client'

import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import * as Icons from 'lucide-react'
import { LucideIcon } from 'lucide-react'
import { cn } from '@/lib/utils'
import { motion } from 'framer-motion'

interface StatCardPremiumProps {
  title: string
  value: string | number
  prefix?: string
  suffix?: string
  decimal?: number
  trend?: {
    value: string
    isPositive: boolean
  }
  icon?: LucideIcon
  iconName?: keyof typeof Icons
  status?: string
  colorVariant?: 'default' | 'demand' | 'ds' | 'sop' | 'orange' | 'emerald' | 'destructive'
  className?: string
}

export function StatCardPremium({
  title,
  value,
  prefix = "",
  suffix = "",
  decimal = 0,
  trend,
  icon: IconProp,
  iconName,
  status,
  colorVariant = 'default',
  className
}: StatCardPremiumProps) {
  
  const Icon = iconName ? (Icons[iconName] as LucideIcon) : IconProp
  
  const colorClasses = {
    default: { text: 'text-plannera-primary', bg: 'bg-plannera-primary', border: 'hover:border-plannera-primary/50', glow: 'rgba(45,53,88,0.6)' },
    demand: { text: 'text-plannera-demand', bg: 'bg-plannera-demand', border: 'hover:border-plannera-demand/50', glow: 'rgba(216,93,75,0.6)' },
    destructive: { text: 'text-plannera-demand', bg: 'bg-plannera-demand', border: 'hover:border-plannera-demand/50', glow: 'rgba(216,93,75,0.6)' },
    ds: { text: 'text-plannera-ds', bg: 'bg-plannera-ds', border: 'hover:border-plannera-ds/50', glow: 'rgba(43,160,157,0.6)' },
    sop: { text: 'text-plannera-sop', bg: 'bg-plannera-sop', border: 'hover:border-plannera-sop/50', glow: 'rgba(58,76,138,0.6)' },
    emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500', border: 'hover:border-emerald-500/50', glow: 'rgba(16,185,129,0.6)' },
    orange: { text: 'text-plannera-orange', bg: 'bg-plannera-orange', border: 'hover:border-plannera-orange/50', glow: 'rgba(247,148,30,0.6)' }
  }

  const formattedValue = typeof value === 'number' 
    ? value.toLocaleString('pt-BR', { minimumFractionDigits: decimal, maximumFractionDigits: decimal })
    : value

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      whileHover={{ y: -4, transition: { duration: 0.2 } }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className="h-full"
    >
      <Card variant="glass" className={cn(
        "p-6 rounded-2xl bg-surface-background border border-border-divider shadow-inner group transition-all h-full flex flex-col justify-between relative overflow-hidden",
        colorClasses[colorVariant].border,
        className
      )}>
        {/* Accent Bar at Bottom */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 opacity-70 group-hover:opacity-100 group-hover:h-1.5",
          colorClasses[colorVariant].bg
        )} />

        <div>
          <div className="flex items-center justify-between mb-4">
            <p className="label-premium uppercase tracking-widest text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">
              {title}
            </p>
            {Icon && (
              <div className={cn(
                "w-12 h-12 rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 aspect-square",
                "bg-gradient-to-br from-white/10 to-transparent border border-white/5",
                "shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-sm",
                "group-hover:scale-110 group-hover:rotate-6",
                "group-hover:border-white/20"
              )}>
                <Icon 
                  className={cn("w-6 h-6 transition-all duration-500", colorClasses[colorVariant].text)}
                  style={{ filter: `drop-shadow(0 0 15px ${colorClasses[colorVariant].glow})` }}
                />
              </div>
            )}
          </div>
          
          <div className="flex items-baseline gap-2">
            <h3 className="text-3xl font-extrabold text-content-primary tracking-tighter leading-none group-hover:text-white transition-colors">
              {prefix}{formattedValue}{suffix}
            </h3>
            {trend && (
              <Badge className={cn(
                "border-none text-[10px] px-1.5 py-0 font-bold",
                trend.isPositive ? "bg-emerald-500/20 text-emerald-500" : "bg-rose-500/20 text-rose-500"
              )}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </Badge>
            )}
          </div>
        </div>

        {status && (
          <div className="mt-4 flex items-center gap-2">
            <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", colorClasses[colorVariant].bg)} />
            <p className="text-[10px] font-bold text-content-secondary uppercase tracking-tight opacity-60 group-hover:opacity-100 transition-opacity">
              {status}
            </p>
          </div>
        )}
      </Card>
    </motion.div>
  )
}
