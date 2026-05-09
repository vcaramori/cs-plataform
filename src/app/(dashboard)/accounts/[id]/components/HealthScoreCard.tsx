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
  const router = useRouter()
  const [generating, setGenerating] = useState(false)

  const scoreValue = Math.round(healthScore)
  const statusColor = scoreValue <= 40 ? 'hsl(var(--destructive))' : scoreValue < 70 ? 'hsl(var(--primary))' : '#10b981'

  const trendIcon = {
    up: <TrendingUp className="w-5 h-5 text-emerald-500" />,
    down: <TrendingDown className="w-5 h-5 text-destructive" />,
    critical: <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />,
    stable: <Minus className="w-5 h-5 text-muted-foreground" />,
  }[healthTrend] ?? <Minus className="w-5 h-5 text-muted-foreground" />

  const displayChartData = chartData.length === 1
    ? [{ date: 'Start', score: chartData[0].score }, { date: 'End', score: chartData[0].score }]
    : chartData

  const handleGenerateShadowScore = async () => {
    setGenerating(true)
    try {
      const res = await fetch('/api/health-scores/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: accountId }),
      })

      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        toast.error(`Erro crítico do servidor (500).`)
        return
      }

      const data = await res.json()
      if (!res.ok) {
        toast.error(data.error ?? 'Erro ao gerar Shadow Score')
        return
      }

      toast.success(`Shadow Score gerado: ${data.shadow_score}`)
      router.refresh()
    } catch (err: any) {
      toast.error('Erro de conexão ou falha no processamento.')
    } finally {
      setGenerating(false)
    }
  }

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
              <AlertTriangle className="w-4 h-4 text-primary animate-pulse -mt-1" />
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
            <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">{trendIcon}</div>
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

      <div className="absolute bottom-4 right-4 z-20">
        <TooltipProvider>
          <Tooltip delayDuration={300}>
            <TooltipTrigger asChild>
              <Button
                onClick={(e) => {
                  e.stopPropagation()
                  handleGenerateShadowScore()
                }}
                disabled={generating}
                variant="premium"
                className="h-8 w-8 p-0 rounded-xl shadow-lg transition-all hover:scale-110 active:scale-95 bg-primary hover:bg-primary/90 text-primary-foreground"
              >
                {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
              </Button>
            </TooltipTrigger>
            <TooltipContent side="top" className="bg-background border-border shadow-2xl">
              <p className="label-premium !text-[9px]">Gatilhar Análise Cognitiva</p>
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </Card>
  )
}
