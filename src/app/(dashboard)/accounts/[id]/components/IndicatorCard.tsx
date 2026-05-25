'use client'

import { motion } from 'framer-motion'
import { Card } from "@/components/ui/card"
import dynamic from 'next/dynamic'
import { Activity, Zap, Ticket, Heart, MessageSquare, ShieldCheck, PieChart, Star, Target, ArrowUpRight, TrendingUp } from 'lucide-react'

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

  const value = indicator.current_value
  const displayValue = indicator.unit === '%' 
    ? `${value}%` 
    : indicator.unit === 'R$' 
      ? `R$ ${value}` 
      : `${value} ${indicator.unit}`

  // Calculate percentage relative to target for the bottom bar if applicable
  // If target is 0, we can't divide, just use 100% or 0%
  const target = indicator.target_value
  const pctOfTarget = target > 0 ? Math.min(100, Math.max(0, (value / target) * 100)) : 0

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 0.1 + (index * 0.1) }}
      onClick={onClick}
      className="flex flex-col items-center justify-center gap-3 relative overflow-hidden rounded-2xl border border-border-divider bg-surface-background h-[120px] shadow-sm group hover:border-primary/30 transition-all cursor-pointer"
    >
      {/* Background Area Chart */}
      <div className="absolute inset-x-0 bottom-0 h-[60%] opacity-30 pointer-events-none z-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id={`colorIndicator${indicator.id}`} x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={color} stopOpacity={0.8} />
                <stop offset="95%" stopColor={color} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis hide domain={['dataMin - 10', 'dataMax + 10']} />
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
        <p className="text-sm font-black text-foreground leading-none tracking-tighter tabular-nums">
          {displayValue}
        </p>
      </div>
    </motion.div>
  )
}
