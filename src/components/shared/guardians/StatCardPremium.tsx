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
  size?: 'sm' | 'default'
  className?: string
  onClick?: () => void
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
  size = 'default',
  className,
  onClick
}: StatCardPremiumProps) {
  
  const Icon = iconName ? (Icons[iconName] as LucideIcon) : IconProp
  
  const colorClasses = {
    default: { 
      text: 'text-plannera-primary dark:text-blue-400', 
      bg: 'bg-plannera-primary dark:bg-blue-500', 
      border: 'hover:border-plannera-primary/50 dark:hover:border-blue-500/30', 
      glow: 'rgba(96,165,250,0.6)' 
    },
    demand: { 
      text: 'text-plannera-demand dark:text-rose-400', 
      bg: 'bg-plannera-demand dark:bg-rose-500', 
      border: 'hover:border-plannera-demand/50 dark:hover:border-rose-500/30', 
      glow: 'rgba(244,63,94,0.6)' 
    },
    destructive: { 
      text: 'text-plannera-demand dark:text-rose-400', 
      bg: 'bg-plannera-demand dark:bg-rose-500', 
      border: 'hover:border-plannera-demand/50 dark:hover:border-rose-500/30', 
      glow: 'rgba(244,63,94,0.6)' 
    },
    ds: { 
      text: 'text-plannera-ds dark:text-cyan-400', 
      bg: 'bg-plannera-ds dark:bg-cyan-500', 
      border: 'hover:border-plannera-ds/50 dark:hover:border-cyan-500/30', 
      glow: 'rgba(6,182,212,0.6)' 
    },
    sop: { 
      text: 'text-plannera-sop dark:text-indigo-400', 
      bg: 'bg-plannera-sop dark:bg-indigo-500', 
      border: 'hover:border-plannera-sop/50 dark:hover:border-indigo-500/30', 
      glow: 'rgba(99,102,241,0.6)' 
    },
    emerald: { 
      text: 'text-success dark:text-emerald-400', 
      bg: 'bg-success dark:bg-emerald-500', 
      border: 'hover:border-success/50 dark:hover:border-emerald-500/30', 
      glow: 'rgba(16,185,129,0.6)' 
    },
    orange: { 
      text: 'text-plannera-orange dark:text-amber-400', 
      bg: 'bg-plannera-orange dark:bg-amber-500', 
      border: 'hover:border-plannera-orange/50 dark:hover:border-amber-500/30', 
      glow: 'rgba(245,158,11,0.6)' 
    }
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
      className={cn("h-full", onClick && "cursor-pointer")}
      onClick={onClick}
    >
      <Card variant="glass" className={cn(
        size === 'sm' ? "p-4" : "p-6",
        "rounded-2xl bg-surface-card/60 dark:bg-slate-800/40 border border-border-divider/50 dark:border-slate-800/40 shadow-[0_8px_32px_0_rgba(0,0,0,0.3)] backdrop-blur-md group transition-all h-full flex flex-col justify-between relative overflow-hidden",
        colorClasses[colorVariant].border,
        className
      )}>
        {/* Accent Bar at Bottom */}
        <div className={cn(
          "absolute bottom-0 left-0 right-0 h-1 transition-all duration-300 opacity-70 group-hover:opacity-100 group-hover:h-1.5",
          colorClasses[colorVariant].bg
        )} />

        <div>
          <div className={cn("flex items-center justify-between", size === 'sm' ? "mb-2" : "mb-4")}>
            <p className="label-premium uppercase tracking-widest text-[10px] opacity-70 group-hover:opacity-100 transition-opacity">
              {title}
            </p>
            {Icon && (
              <div className={cn(
                size === 'sm' ? "w-8 h-8" : "w-12 h-12",
                "rounded-full flex items-center justify-center transition-all duration-500 flex-shrink-0 aspect-square",
                "bg-gradient-to-br from-white/10 to-transparent border border-white/5",
                "shadow-[0_8px_32px_rgba(0,0,0,0.2)] backdrop-blur-sm",
                "group-hover:scale-110 group-hover:rotate-6",
                "group-hover:border-white/20"
              )}>
                <Icon 
                  className={cn(size === 'sm' ? "w-4 h-4" : "w-6 h-6", "transition-all duration-500", colorClasses[colorVariant].text)}
                  style={{ filter: `drop-shadow(0 0 15px ${colorClasses[colorVariant].glow})` }}
                />
              </div>
            )}
          </div>
          
          <div className="flex items-baseline gap-2">
            <h3 className={cn(
              size === 'sm' ? "text-xl md:text-2xl" : "text-3xl",
              "font-extrabold text-content-primary tracking-tighter leading-none group-hover:text-white transition-colors"
            )}>
              {prefix}{formattedValue}{suffix}
            </h3>
            {trend && (
              <Badge className={cn(
                "border-none text-[10px] px-1.5 py-0 font-bold",
                trend.isPositive ? "bg-success/20 text-success" : "bg-rose-500/20 text-rose-500"
              )}>
                {trend.isPositive ? '↑' : '↓'} {trend.value}
              </Badge>
            )}
          </div>
        </div>

        {status && (
          <div className={cn(size === 'sm' ? "mt-2" : "mt-4", "flex items-center gap-2")}>
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
