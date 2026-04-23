'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  ArrowLeft,
  TrendingUp,
  TrendingDown,
  Minus,
  AlertTriangle,
  Sparkles,
  Loader2,
  Info,
  Calendar,
  DollarSign,
  Zap,
  Ticket,
  Heart,
  Settings2,
  Table as TableIcon,
  LineChart as ChartIcon,
  Pencil,
  User,
  Activity,
  Clock,
  AlertCircle,
  MessageSquare,
  ShieldCheck,
  ShieldOff,
} from 'lucide-react'
import { differenceInDays, parseISO } from 'date-fns'
import { HealthScoreDetailsModal } from './HealthScoreDetailsModal'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { HealthScoreEditModal } from '../../../dashboard/components/HealthScoreEditModal'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion } from 'framer-motion'
import { cn, formatCurrency } from '@/lib/utils'
import dynamic from 'next/dynamic'

const XAxis = dynamic(() => import('recharts').then(mod => mod.XAxis), { ssr: false })
const YAxis = dynamic(() => import('recharts').then(mod => mod.YAxis), { ssr: false })
const ResponsiveContainer = dynamic(() => import('recharts').then(mod => mod.ResponsiveContainer), { ssr: false })
const AreaChart = dynamic(() => import('recharts').then(mod => mod.AreaChart), { ssr: false })
const Area = dynamic(() => import('recharts').then(mod => mod.Area), { ssr: false })
const LineChart = dynamic(() => import('recharts').then(mod => mod.LineChart), { ssr: false })
const Line = dynamic(() => import('recharts').then(mod => mod.Line), { ssr: false })


function HealthMiniGauge({ label, value, icon: Icon, color, index, displayLabel }: {
  label: string, value: number, icon: any, color: string, index: number, displayLabel?: string
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.2 + (index * 0.1) }}
      className="flex flex-col items-center gap-2 group min-w-0"
    >
      <div className="w-12 h-12 rounded-2xl border border-border-divider flex items-center justify-center relative overflow-hidden bg-surface-background shadow-sm transition-all group-hover:border-primary group-hover:shadow-[0_0_15px_rgba(var(--primary-rgb),0.1)]">
        <div
          className="absolute bottom-0 left-0 w-full transition-all duration-1000"
          style={{ height: `${value}%`, backgroundColor: color, opacity: 0.15 }}
        />
        <Icon className="w-5 h-5 relative z-10" style={{ color }} />
      </div>
      <div className="text-center overflow-hidden w-full">
        <p className="label-premium opacity-50 mb-0.5 truncate px-1">{label}</p>
        <p className="text-[11px] font-black text-foreground leading-none tracking-tighter tabular-nums">
          {displayLabel ?? `${Math.round(value)}%`}
        </p>
      </div>
    </motion.div>
  )
}

import { Account, HealthScore } from '@/lib/supabase/types'

export function AccountHeader({ account, latestHealthScore, currentAdoptionScore }: {
  account: Account & { contracts?: any[]; discrepancy_alert?: boolean }
  latestHealthScore?: HealthScore | null
  currentAdoptionScore?: number
}) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)
  const [showDetails, setShowDetails] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [history, setHistory] = useState<any[]>([])
  const [summaryData, setSummaryData] = useState<any>(null)
  const [npsScore, setNpsScore] = useState<number | null>(null)
  const [slaActive, setSlaActive] = useState<boolean | null>(null)

  useEffect(() => {
    fetchHistory()
    fetchNPS()
    fetchSLA()
  }, [account.id])

  async function fetchHistory() {
    try {
      const res = await fetch(`/api/health-scores/${account.id}`)
      const data = await res.json()
      setHistory(data.history || [])
      setSummaryData(data)
    } catch (err) {
      console.error('Error fetching history:', err)
    }
  }

  async function fetchNPS() {
    try {
      const res = await fetch(`/api/nps/stats?account_id=${account.id}`)
      if (!res.ok) return
      const data = await res.json()
      if (data.total_responses > 0) setNpsScore(data.nps_score)
    } catch {}
  }

  async function fetchSLA() {
    try {
      const contracts = account.contracts || []
      const activeContract = contracts.find((c: any) => c.status === 'active') || contracts[0]
      if (!activeContract) { setSlaActive(false); return }
      const res = await fetch(`/api/sla-policies?contract_id=${activeContract.id}`)
      if (!res.ok) { setSlaActive(false); return }
      const data = await res.json()
      setSlaActive(!!data)
    } catch { setSlaActive(false) }
  }

  // Agrupar por data para o sparkline de fundo
  const groupedSparkline = (history || []).reduce((acc: any, h: any) => {
    const dateKey = h.date
    if (!acc[dateKey]) {
      acc[dateKey] = { date: h.date, score: null }
    }
    // No sparkline de fundo, priorizamos o score manual ou o shadow se presente
    acc[dateKey].score = h.manual_score ?? h.shadow_score
    return acc
  }, {})

  const chartData = (Object.values(groupedSparkline) as { date: string, score: number | null }[])
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-10) // Mantém os últimos 10 dias

  // Cálculo de estagnação
  const lastManualDate = summaryData?.manual?.date
  const daysSinceUpdate = lastManualDate ? differenceInDays(new Date(), parseISO(lastManualDate)) : null
  const scoreValue = Math.round(account.health_score)

  // Cores semânticas para o Gauge
  const statusColor = scoreValue <= 40 ? 'var(--destructive)' : scoreValue < 70 ? 'var(--primary)' : 'var(--emerald-500)'

  async function handleGenerateShadowScore() {
    setGenerating(true)
    try {
      const res = await fetch('/api/health-scores/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id }),
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
      fetchHistory()
    } catch (err: any) {
      toast.error('Erro de conexão ou falha no processamento.')
    } finally {
      setGenerating(false)
    }
  }

  const activeContract = account.contracts?.find((c: any) => c.status === 'active') || account.contracts?.[0]
  const renewalDate = activeContract?.renewal_date ? new Date(activeContract.renewal_date + 'T12:00:00') : null
  const daysToRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : null

  const renewalColor = !daysToRenewal ? 'text-muted-foreground' :
    daysToRenewal < 30 ? 'text-destructive font-black' :
      daysToRenewal < 90 ? 'text-amber-500' : 'text-emerald-500'

  const trendIcon = {
    up: <TrendingUp className="w-5 h-5 text-emerald-500" />,
    down: <TrendingDown className="w-5 h-5 text-destructive" />,
    critical: <AlertTriangle className="w-5 h-5 text-destructive animate-pulse" />,
    stable: <Minus className="w-5 h-5 text-muted-foreground" />,
  }[account.health_trend] ?? <Minus className="w-5 h-5 text-muted-foreground" />

  // Se houver apenas 1 ponto, duplicamos para o gráfico renderizar uma área
  const displayChartData = chartData.length === 1 
    ? [{ date: 'Start', score: chartData[0].score }, { date: 'End', score: chartData[0].score }]
    : chartData

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-top-4 duration-700">

      {/* Top Bar Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-6">

        {/* Esquerda: botão voltar + identidade da conta */}
        <div className="flex items-center gap-4 sm:gap-8 min-w-0">
          <Link href="/dashboard" className="shrink-0">
            <Button variant="outline" size="icon" className="w-12 h-12 rounded-2xl shadow-sm border-border/50 group">
              <ArrowLeft className="w-5 h-5 group-hover:-translate-x-1 transition-transform" />
            </Button>
          </Link>

          <div className="flex items-center gap-4 min-w-0">
            <div className="w-12 h-12 sm:w-16 sm:h-16 rounded-2xl bg-primary flex items-center justify-center text-primary-foreground font-black text-xl sm:text-2xl shadow-xl border border-primary/20 shrink-0">
              {account.name?.charAt(0) || '?'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="text-2xl sm:text-3xl lg:text-4xl font-black text-foreground tracking-tighter uppercase leading-none">
                  {account.name}
                </h1>
                <Badge variant="neutral" className="bg-primary/10 text-primary border-primary/20 px-3 py-1 font-black uppercase tracking-[0.2em] text-[9px] h-6 shrink-0 rounded-xl">
                  {account.segment}
                </Badge>
                <Link
                  href={`/accounts/${account.id}/edit`}
                  className="inline-flex items-center justify-center w-8 h-8 rounded-xl bg-surface-background hover:bg-surface-card text-content-secondary hover:text-content-primary transition-all shadow-sm border border-border-divider"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="label-premium !text-[11px] opacity-40 flex items-center gap-2 mt-2 truncate">
                ID: {account.id.split('-')[0]}
                <span className="opacity-30">/</span>
                {account.industry || 'Global Portfolio'}
              </p>
            </div>
          </div>
        </div>

        {/* Direita: pills financeiros */}
        <div className="flex items-center gap-4 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <Card variant="glass" className="flex items-center gap-3 px-4 py-3 rounded-2xl border-border/50 shrink-0 shadow-lg">
            <div className="w-11 h-11 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-100 dark:border-emerald-500/20">
              <DollarSign className="w-5 h-5 text-emerald-500" />
            </div>
            <div className="flex flex-col">
              <span className="label-premium !text-[9px] opacity-50 mb-1">Receita Mensal</span>
              <span className="text-xl font-black text-foreground tracking-tighter tabular-nums">
                {formatCurrency(activeContract?.mrr || 0)}
              </span>
            </div>
          </Card>

          <Card variant="glass" className="flex items-center gap-3 px-4 py-3 rounded-2xl border-border/50 shrink-0 shadow-lg">
            <div className="w-11 h-11 rounded-2xl bg-amber-50 dark:bg-amber-500/10 flex items-center justify-center border border-amber-100 dark:border-amber-500/20">
              <Calendar className="w-5 h-5 text-amber-500" />
            </div>
            <div className="flex flex-col">
              <span className="label-premium !text-[9px] opacity-50 mb-1">Renovação</span>
              <span className={cn("text-xl font-black tracking-tighter tabular-nums", renewalColor)}>
                {daysToRenewal !== null ? (daysToRenewal < 0 ? 'Expirado' : `em ${daysToRenewal}d`) : 'N/A'}
              </span>
            </div>
          </Card>
        </div>
      </div>

      {/* Health & Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">

        {/* Anel de Health Score */}
        <Card 
          variant="glass"
          onClick={() => setShowDetails(true)}
          className="lg:col-span-1 p-6 flex flex-col justify-between items-center relative group min-h-[160px] border-border rounded-2xl cursor-pointer hover:bg-accent/20 transition-all overflow-hidden shadow-2xl"
        >
          {/* Background Sparkline (Subtle Area) */}
          <div className="absolute inset-x-0 -bottom-1 h-full opacity-[0.05] pointer-events-none z-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <Area 
                  type="monotone" 
                  dataKey="score" 
                  stroke="var(--primary)" 
                  strokeWidth={2} 
                  fill="var(--primary)"
                  connectNulls
                  isAnimationActive={true}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-6 w-full relative z-10">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-20 h-20 -rotate-90">
                <circle cx="48" cy="48" r="42" fill="none" stroke="var(--border)" className="opacity-10" strokeWidth="8" />
                <motion.circle
                  initial={{ strokeDasharray: "0 264" }}
                  animate={{ strokeDasharray: `${(account.health_score / 100) * 264} 264` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  cx="48" cy="48" r="42" fill="none"
                  stroke={statusColor}
                  strokeWidth="8"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-black text-foreground tracking-tighter tabular-nums">{Math.round(account.health_score)}</span>
                {account.discrepancy_alert && (
                  <AlertTriangle className="w-4 h-4 text-primary animate-pulse -mt-1" />
                )}
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-1.5">
                <p className="label-premium !text-[11px] opacity-60">Health Index</p>
                  <Button
                  variant="ghost"
                  size="icon"
                  className="w-7 h-7 rounded-xl opacity-40 group-hover:opacity-100 hover:bg-primary/10 text-muted-foreground hover:text-primary transition-all border border-transparent hover:border-primary/20"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEditModal(true)
                  }}
                >
                  <Pencil className="w-4 h-4" />
                </Button>
              </div>
              
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-500 border border-emerald-100 dark:border-emerald-500/20 shadow-sm">{trendIcon}</div>
                <span className="text-lg font-black text-foreground uppercase tracking-tighter">
                  {{ up: 'Alta', down: 'Queda', critical: 'Crítico', stable: 'Estável' }[account.health_trend] ?? account.health_trend}
                </span>
              </div>
              {latestHealthScore?.classification && (
                <p className="label-premium !text-[10px] opacity-40 mt-3 truncate font-medium">
                  {latestHealthScore.classification}
                </p>
              )}
            </div>
          </div>

          <div className="w-full flex justify-end mt-4 relative z-10">
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
                    className="h-11 w-11 p-0 rounded-2xl shadow-xl transition-all hover:scale-110 active:scale-95"
                  >
                    {generating ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-6 h-6" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-background border-border shadow-2xl">
                  <p className="label-premium !text-[9px]">Gatilhar Análise Cognitiva</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </Card>

        {/* Gauges de saúde + NPS + SLA + Score IA */}
        <Card variant="glass" className="lg:col-span-3 p-5 flex items-center justify-between gap-2 border-border shadow-2xl rounded-2xl overflow-hidden">
          <div className="flex-1 grid grid-cols-6 gap-2 items-start">
            <HealthMiniGauge index={0} label="Adoção"   value={currentAdoptionScore ?? latestHealthScore?.engagement_component ?? 50} icon={Zap}    color="var(--emerald-500)" />
            <HealthMiniGauge index={1} label="Tickets"   value={latestHealthScore?.ticket_component     || 50} icon={Ticket} color="var(--amber-500)" />
            <HealthMiniGauge index={2} label="Relation" value={latestHealthScore?.sentiment_component  || 50} icon={Heart}  color="var(--primary)" />

            <HealthMiniGauge
              index={3}
              label="NPS"
              value={npsScore === null ? 50 : Math.max(0, (npsScore + 100) / 2)}
              icon={MessageSquare}
              color="var(--primary)"
              displayLabel={npsScore === null ? '—' : npsScore > 0 ? `+${npsScore}` : String(npsScore)}
            />

            <HealthMiniGauge
              index={4}
              label="SLA"
              value={slaActive === null ? 50 : slaActive ? 100 : 15}
              icon={slaActive ? ShieldCheck : ShieldOff}
              color={slaActive ? "var(--emerald-500)" : "var(--muted-foreground)"}
              displayLabel={slaActive === null ? '—' : slaActive ? 'OK' : 'Err.'}
            />

            {/* Score IA */}
            <div className="flex flex-col items-center gap-2 group min-w-0">
              {latestHealthScore?.shadow_score != null ? (
                <>
                  <div className="w-12 h-12 rounded-2xl border border-primary/20 bg-primary/10 flex items-center justify-center shadow-inner group-hover:border-primary transition-all shrink-0">
                    <Sparkles className="w-5 h-5 text-primary animate-pulse" />
                  </div>
                  <div className="text-center overflow-hidden w-full">
                    <p className="label-premium opacity-50 mb-0.5 truncate">IA Score</p>
                    <div className="flex items-center gap-1 justify-center">
                      <span className="text-[11px] font-black text-primary leading-none tracking-tighter tabular-nums">
                        {Math.round(latestHealthScore.shadow_score)}
                      </span>
                      {latestHealthScore.shadow_reasoning && (
                        <button
                          onClick={() => setShowReasoning(!showReasoning)}
                          className="text-muted-foreground hover:text-primary transition-colors h-3 w-3 bg-accent rounded-full flex items-center justify-center shrink-0"
                        >
                          <Info className="w-2.5 h-2.5" />
                        </button>
                      )}
                    </div>
                  </div>
                </>
              ) : (
                <>
                  <div className="w-12 h-12 rounded-2xl border border-border-divider bg-surface-background flex items-center justify-center opacity-30 shrink-0">
                    <Sparkles className="w-5 h-5 text-muted-foreground" />
                  </div>
                  <div className="text-center opacity-30 overflow-hidden w-full">
                    <p className="label-premium opacity-50 mb-0.5 truncate">IA Score</p>
                    <p className="label-premium italic !text-[8px]">Proc.</p>
                  </div>
                </>
              )}
            </div>
          </div>
        </Card>
      </div>

      {showReasoning && latestHealthScore?.shadow_reasoning && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="bg-surface-background border border-primary/20 rounded-2xl p-6 relative overflow-hidden shadow-2xl backdrop-blur-xl"
        >
          <div className="absolute top-0 left-0 w-2 h-full bg-primary/50" />
          <div className="flex items-center gap-4 mb-4">
            <div className="p-2 rounded-xl bg-primary/10 border border-primary/20">
               <Settings2 className="w-5 h-5 text-primary" />
            </div>
            <span className="label-premium !text-xs text-primary">Strategic Reasoning Intelligence</span>
          </div>
          <p className="text-foreground text-sm italic font-medium leading-relaxed tracking-tight max-w-4xl">
            &quot;{latestHealthScore.shadow_reasoning}&quot;
          </p>
        </motion.div>
      )}

      <HealthScoreDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        accountId={account.id}
        accountName={account.name}
      />

      <HealthScoreDetailsModal
        isOpen={showDetails}
        onClose={() => setShowDetails(false)}
        accountId={account.id}
        accountName={account.name}
      />

      <HealthScoreEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        account={{ id: account.id, name: account.name, health_score: account.health_score }}
        onSuccess={() => {
          router.refresh()
          fetchHistory()
        }}
      />
    </div>
  )
}
