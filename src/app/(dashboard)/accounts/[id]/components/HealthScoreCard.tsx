'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from "@/components/ui/card"
import { Button } from '@/components/ui/button'
import { AlertTriangle, Sparkles, Loader2, Pencil, TrendingUp, TrendingDown, Minus } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { motion } from 'framer-motion'
import dynamic from 'next/dynamic'
import { HealthScore } from '@/lib/supabase/types'
import { classifyHealth } from '@/lib/health/classify'
import { toast } from 'sonner'

const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })

interface HealthScoreCardProps {
  healthScore: number
  healthTrend: string
  discrepancyAlert?: boolean
  latestHealthScore?: HealthScore | null
  chartData: any[]
  onEditClick: () => void
  onDetailsClick: () => void
  accountId: string
}

export function HealthScoreCard({
  healthScore,
  healthTrend,
  discrepancyAlert,
  latestHealthScore,
  chartData,
  onEditClick,
  onDetailsClick,
  accountId,
}: HealthScoreCardProps) {
  const scoreValue = Math.round(healthScore)
  const statusColor = classifyHealth(scoreValue).color // régua única

  const trendStyle = {
    up: {
      bg: 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400',
      icon: <TrendingUp className="w-5 h-5" />
    },
    down: {
      bg: 'bg-red-500/10 border-red-500/20 text-red-400',
      icon: <TrendingDown className="w-5 h-5" />
    },
    critical: {
      bg: 'bg-red-500/20 border-red-500/30 text-red-400 animate-pulse',
      icon: <AlertTriangle className="w-5 h-5" />
    },
    stable: {
      bg: 'bg-slate-800/50 border-slate-700/30 text-slate-400',
      icon: <Minus className="w-5 h-5" />
    }
  }[healthTrend as 'up' | 'down' | 'critical' | 'stable'] ?? {
    bg: 'bg-slate-800/50 border-slate-700/30 text-slate-400',
    icon: <Minus className="w-5 h-5" />
  }

  const displayChartData = chartData.length === 1
    ? [{ date: 'Start', score: chartData[0].score }, { date: 'End', score: chartData[0].score }]
    : chartData

  return (
    <Card
      variant="glass"
      onClick={onDetailsClick}
      className="lg:col-span-1 p-6 flex flex-col justify-center items-center relative group min-h-[160px] border-border rounded-2xl cursor-pointer hover:bg-accent/20 transition-all overflow-hidden shadow-2xl"
    >
      <div className="absolute inset-x-0 -bottom-1 h-full opacity-60 pointer-events-none z-0">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={displayChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
            <defs>
              <linearGradient id="colorScore" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor={statusColor} stopOpacity={0.5} />
                <stop offset="95%" stopColor={statusColor} stopOpacity={0} />
              </linearGradient>
            </defs>
            <YAxis domain={[0, 100]} hide />
            <Area
              type="monotone"
              dataKey="score"
              stroke={statusColor}
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorScore)"
              connectNulls
              isAnimationActive={true}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="flex items-center gap-6 w-full relative z-10">
        <div className="relative flex items-center justify-center shrink-0">
          <svg className="w-20 h-20 -rotate-90" viewBox="0 0 80 80">
            <circle cx="40" cy="40" r="36" fill="none" stroke="var(--border)" className="opacity-10" strokeWidth="8" />
            <motion.circle
              initial={{ strokeDasharray: "0 226" }}
              animate={{ strokeDasharray: `${(healthScore / 100) * 226} 226` }}
              transition={{ duration: 1.5, ease: "easeOut" }}
              cx="40" cy="40" r="36" fill="none"
              stroke={statusColor}
              strokeWidth="8"
              strokeLinecap="round"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span className="text-3xl font-black text-foreground tracking-tighter tabular-nums">{scoreValue}</span>
            {discrepancyAlert && (
              <AlertTriangle className="w-4 h-4 text-plannera-orange animate-pulse -mt-1" />
            )}
          </div>
        </div>
        <div className="flex flex-col min-w-0">
          <div className="flex items-center gap-2 mb-1.5">
            <p className="label-premium !text-[11px] opacity-60">Índice de Saúde</p>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 rounded-xl opacity-60 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20"
              onClick={(e) => {
                e.stopPropagation()
                onEditClick()
              }}
            >
              <Pencil className="w-4 h-4" />
            </Button>
          </div>

          <div className="flex items-center gap-3">
            <div className={`p-2.5 rounded-xl border shadow-sm ${trendStyle.bg}`}>{trendStyle.icon}</div>
            <span className="text-lg font-black text-foreground uppercase tracking-tighter">
              {{ up: 'Alta', down: 'Queda', critical: 'Crítico', stable: 'Estável' }[healthTrend] ?? healthTrend}
            </span>
          </div>
          {latestHealthScore?.classification && (
            <p className="label-premium !text-[10px] opacity-60 mt-3 truncate font-medium">
              {latestHealthScore.classification}
            </p>
          )}
        </div>
      </div>

    </Card>
  )
}
