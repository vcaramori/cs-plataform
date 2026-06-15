'use client'

import { motion } from 'framer-motion'
import { Card } from "@/components/ui/card"
import dynamic from 'next/dynamic'
import { Activity, Zap, Ticket, Heart, MessageSquare, ShieldCheck, PieChart, Star, Target, ArrowUpRight, TrendingUp } from 'lucide-react'
import { cn } from '@/lib/utils'

const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })

export const iconMap: Record<string, any> = {
  Activity, Zap, Ticket, Heart, MessageSquare, ShieldCheck, PieChart, Star, Target, ArrowUpRight, TrendingUp
}

interface IndicatorCardProps {
  indicator: any
  history: any[]
  onClick: () => void
  index?: number
}

export function IndicatorCard({ indicator, history, onClick, index = 0 }: IndicatorCardProps) {
  const Icon = iconMap[indicator.icon] || Activity
  const color = indicator.color || '#2ba09d' // plannera primary
  
  // Prepare chart data (ensure at least 2 points for a line/area)
  const chartData = history.length === 1 
    ? [{ date: 'Start', score: history[0].value }, { date: 'End', score: history[0].value }]
    : history.map(h => ({ date: h.date, score: h.value }))

  const value = indicator.current_value || 0
  const target = indicator.target_value || 0
  
  const displayValue = indicator.unit === '%' 
    ? `${value}%` 
    : indicator.unit === 'R$' 
      ? `R$ ${value}` 
      : `${value} ${indicator.unit}`
      
  const targetDisplayValue = indicator.unit === '%' 
    ? `${target}%` 
    : indicator.unit === 'R$' 
      ? `R$ ${target}` 
      : `${target} ${indicator.unit}`

  const isPercent = indicator.unit === '%'
  // Se for porcentagem, a altura total do card representa sempre 100%.
  // Se não for, representa a meta (ou 120% do valor se não houver meta)
  const maxDomain = isPercent ? 100 : (target > 0 ? Math.max(target, value) : value * 1.2 || 100)

  // Barra inferior sempre baseada na porcentagem em relação à meta
  const pctOfTarget = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0

  // Acompanhamento do prazo da meta (data-alvo)
  const targetStatus = (() => {
    if (pctOfTarget >= 100) return { label: 'Atingida', cls: 'bg-success/15 text-success' }
    if (!indicator.target_date) return { label: 'Sem prazo', cls: 'bg-muted text-content-secondary/70' }
    const today = new Date()
    today.setHours(0, 0, 0, 0)
    const due = new Date(indicator.target_date + 'T00:00:00')
    const diff = Math.ceil((due.getTime() - today.getTime()) / 86400000)
    if (diff < 0) return { label: 'Atrasada', cls: 'bg-red-500/15 text-red-500' }
    if (diff === 0) return { label: 'Vence hoje', cls: 'bg-amber-500/15 text-amber-500' }
    if (diff <= 7) return { label: `faltam ${diff}d`, cls: 'bg-amber-500/15 text-amber-500' }
    if (diff <= 30) return { label: `faltam ${diff}d`, cls: 'bg-muted text-content-secondary' }
    return { label: `até ${due.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })}`, cls: 'bg-muted text-content-secondary' }
  })()

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + (index * 0.1) }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 relative overflow-hidden rounded-2xl border border-border-divider bg-surface-background h-[120px] shadow-sm group hover:border-primary/30 transition-all cursor-pointer"
    >
      {/* Background Area Chart */}
      <div className="absolute inset-0 opacity-20 pointer-events-none z-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`colorIndicator${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0.1} />
              </linearGradient>
            </defs>
            <YAxis hide type="number" domain={[0, maxDomain]} allowDataOverflow={true} />
            <Area
              type="monotone"
              dataKey="score"
              stroke={color}
              strokeWidth={2}
              fillOpacity={1}
              fill={`url(#colorIndicator${indicator.id})`}
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Progress bar at the bottom */}
      <div className="absolute bottom-0 left-0 w-full h-[3px] bg-muted/20 z-10" />
      <div 
        className="absolute bottom-0 left-0 h-[3px] z-10 transition-all duration-1000" 
        style={{ backgroundColor: color, width: `${pctOfTarget}%` }} 
      />

      <Icon className="w-6 h-6 relative z-10 transition-transform group-hover:scale-110" style={{ color }} />

      <div className="text-center relative z-10 w-full px-1">
        <p className="label-premium !text-[9px] opacity-70 mb-1 truncate">{indicator.name}</p>
        <p className="text-sm font-black text-foreground leading-none tracking-tighter tabular-nums flex items-baseline justify-center gap-1">
          {displayValue}
          <span className="text-[10px] text-content-secondary opacity-60">/ {targetDisplayValue}</span>
        </p>
        <span className={cn('mt-1.5 inline-flex items-center px-1.5 py-0.5 rounded-full text-[8px] font-black uppercase tracking-wide', targetStatus.cls)}>
          {targetStatus.label}
        </span>
      </div>
    </motion.div>
  )
}
