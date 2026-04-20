'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
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
      className="flex flex-col items-center gap-2 group"
    >
      <div className={cn(
        "w-12 h-12 rounded-2xl border border-white/5 flex items-center justify-center relative overflow-hidden bg-white/5 shadow-lg transition-all group-hover:border-plannera-sop/50",
      )}>
        <div
          className="absolute bottom-0 left-0 w-full transition-all duration-1000"
          style={{ height: `${value}%`, backgroundColor: color, opacity: 0.2 }}
        />
        <Icon className="w-5 h-5 relative z-10" style={{ color }} />
      </div>
      <div className="text-center">
        <p className="text-[9px] text-slate-400 uppercase font-extrabold tracking-widest leading-none mb-1">{label}</p>
        <p className="text-sm font-bold text-white leading-none tracking-tight">
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
  const isStale = daysSinceUpdate !== null && daysSinceUpdate > 30
  const scoreValue = Math.round(account.health_score)

  // Cores dinâmicas (Semáforo) - Somente para o Gauge Circular
  const statusColor = scoreValue <= 40 ? '#d85d4b' : scoreValue < 70 ? '#f7941e' : '#2ba09d'

  async function handleGenerateShadowScore() {
    setGenerating(true)
    try {
      const res = await fetch('/api/health-scores/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id }),
      })

      // Valida se a resposta é JSON antes de parsear
      const contentType = res.headers.get('content-type')
      if (!contentType || !contentType.includes('application/json')) {
        const text = await res.text()
        console.error('Resposta não-JSON recebida:', text)
        toast.error(`Erro crítico do servidor (500). Verifique os logs.`)
        return
      }

      const data = await res.json()
      if (!res.ok) { 
        toast.error(data.error ?? 'Erro ao gerar Shadow Score')
        return 
      }
      
      toast.success(`Shadow Score gerado: ${data.shadow_score}`)
      router.refresh()
      fetchHistory() // Atualiza o sparkline
    } catch (err: any) {
      console.error('Erro na geração de Shadow Score:', err)
      toast.error('Erro de conexão ou falha no processamento.')
    } finally {
      setGenerating(false)
    }
  }

  const activeContract = account.contracts?.find((c: any) => c.status === 'active') || account.contracts?.[0]
  const renewalDate = activeContract?.renewal_date ? new Date(activeContract.renewal_date + 'T12:00:00') : null
  const daysToRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : null

  const renewalColor = !daysToRenewal ? 'text-slate-500' :
    daysToRenewal < 30 ? 'text-red-400 font-black glow-red' :
      daysToRenewal < 90 ? 'text-amber-400' : 'text-emerald-400'

  const trendIcon = {
    up: <TrendingUp className="w-5 h-5 text-plannera-ds" />,
    down: <TrendingDown className="w-5 h-5 text-plannera-demand" />,
    critical: <AlertTriangle className="w-5 h-5 text-plannera-demand animate-pulse" />,
    stable: <Minus className="w-5 h-5 text-plannera-grey" />,
  }[account.health_trend] ?? <Minus className="w-5 h-5 text-plannera-grey" />

  // Se houver apenas 1 ponto, duplicamos para o gráfico renderizar uma área
  const displayChartData = chartData.length === 1 
    ? [{ date: 'Start', score: chartData[0].score }, { date: 'End', score: chartData[0].score }]
    : chartData

  return (
    <div className="flex flex-col gap-6 w-full animate-in fade-in slide-in-from-top-4 duration-500">

      {/* Top Bar Navigation
          Mobile: empilha verticalmente (flex-col)
          Desktop (sm+): lado a lado com justify-between
      */}
      <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-4">

        {/* Esquerda: botão voltar + identidade da conta */}
        <div className="flex items-center gap-3 sm:gap-6 min-w-0">
          <Link href="/dashboard" className="shrink-0">
            <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white bg-white/5 border border-white/5 hover:border-black/20 rounded-xl h-9">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </Link>

          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 sm:w-12 sm:h-12 rounded-2xl bg-plannera-sop flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-xl border border-white/10 shrink-0">
              {account.name?.charAt(0) || '?'}
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-heading font-bold text-white tracking-tight uppercase leading-tight">
                  {account.name}
                </h1>
                <Badge className="bg-plannera-orange/10 text-plannera-orange border-plannera-orange/20 px-2.5 py-0.5 font-bold uppercase tracking-wide text-xs h-5 shrink-0">
                  {account.segment}
                </Badge>
                <Link
                  href={`/accounts/${account.id}/edit`}
                  className="inline-flex items-center justify-center w-7 h-7 rounded-lg bg-white/5 hover:bg-white/10 text-slate-400 hover:text-white transition-colors"
                >
                  <Pencil className="w-3.5 h-3.5" />
                </Link>
              </div>
              <p className="text-slate-500 text-xs font-bold uppercase tracking-wide flex items-center gap-1.5 mt-0.5 truncate">
                ID: <span className="text-slate-400">{account.id.split('-')[0]}</span>
                <span className="text-slate-600">•</span>
                {account.industry || 'Global Context'}
              </p>
            </div>
          </div>
        </div>

        {/* Direita: pills financeiros
            No mobile ficam abaixo e com scroll horizontal se necessário
        */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 sm:pb-0 shrink-0">
          <div className="glass-card flex items-center gap-3 px-4 py-2.5 rounded-2xl border-white/5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-plannera-ds/10 flex items-center justify-center border border-plannera-ds/20">
              <DollarSign className="w-4 h-4 text-plannera-ds" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wide leading-none mb-0.5">Receita Mensal (MRR)</span>
              <span className="text-base font-bold text-white tracking-tight">
                {formatCurrency(activeContract?.mrr || 0)}
              </span>
            </div>
          </div>

          <div className="glass-card flex items-center gap-3 px-4 py-2.5 rounded-2xl border-white/5 shrink-0">
            <div className="w-9 h-9 rounded-xl bg-plannera-sop/10 flex items-center justify-center border border-plannera-sop/20">
              <Calendar className="w-4 h-4 text-plannera-sop" />
            </div>
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase font-bold tracking-wide leading-none mb-0.5">Renovação</span>
              <span className={cn("text-base font-bold tracking-tight", renewalColor)}>
                {daysToRenewal !== null ? (daysToRenewal < 0 ? 'Expirado' : `em ${daysToRenewal}d`) : 'N/A'}
              </span>
            </div>
          </div>

        </div>
      </div>

      {/* Health & Intelligence Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">

        {/* Anel de Health Score */}
        <div 
          onClick={() => setShowDetails(true)}
          className="lg:col-span-1 glass-card p-5 flex flex-col justify-between items-center relative group min-h-[140px] border-white/5 cursor-pointer hover:bg-white/[0.03] transition-all overflow-hidden"
        >
          {/* Background Sparkline (Subtle Area) - Explicitly z-0 */}
          <div className="absolute inset-x-0 -bottom-1 h-full opacity-[0.15] pointer-events-none z-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={displayChartData} margin={{ top: 0, right: 0, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="healthGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f7941e" stopOpacity={0.3}/>
                    <stop offset="95%" stopColor="#f7941e" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                  <YAxis hide domain={[0, 100]} />
                  <XAxis dataKey="date" hide padding={{ left: 0, right: 0 }} />
                  <Area 
                    type="monotone" 
                    dataKey="score" 
                    stroke="#f7941e" 
                    strokeWidth={1} 
                    fillOpacity={1} 
                    fill="url(#healthGradient)"
                    connectNulls
                    isAnimationActive={true}
                  />
                </AreaChart>
            </ResponsiveContainer>
          </div>

          <div className="flex items-center gap-5 w-full relative z-10">
            <div className="relative flex items-center justify-center shrink-0">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="rgba(255,255,255,0.05)" strokeWidth="6" />
                <motion.circle
                  initial={{ strokeDasharray: "0 176" }}
                  animate={{ strokeDasharray: `${(account.health_score / 100) * 176} 176` }}
                  transition={{ duration: 1.5, ease: "easeOut" }}
                  cx="32" cy="32" r="28" fill="none"
                  stroke={statusColor}
                  strokeWidth="6"
                  strokeLinecap="round"
                />
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-xl font-bold text-white leading-none">{Math.round(account.health_score)}</span>
                {account.discrepancy_alert && (
                  <AlertTriangle className="w-2.5 h-2.5 text-plannera-orange animate-pulse mt-0.5" />
                )}
              </div>
            </div>
            <div className="flex flex-col min-w-0">
              <div className="flex items-center gap-2 mb-0.5">
                <p className="text-[10px] text-slate-400 uppercase font-black tracking-widest whitespace-nowrap">Health Score</p>
                  <Button
                  variant="ghost"
                  size="icon"
                  className="w-5 h-5 rounded-md opacity-50 group-hover:opacity-100 hover:bg-white/10 text-slate-500 hover:text-plannera-orange transition-all"
                  onClick={(e) => {
                    e.stopPropagation()
                    setShowEditModal(true)
                  }}
                >
                  <Pencil className="w-3 h-3" />
                </Button>
              </div>
              
              <div className="flex items-center gap-2">
                <div className="p-1 rounded-lg bg-white/5 border border-white/5 scale-90">{trendIcon}</div>
                <span className="text-sm font-bold text-white uppercase tracking-tight">
                  {{ up: 'Alta', down: 'Queda', critical: 'Crítico', stable: 'Estável' }[account.health_trend] ?? account.health_trend}
                </span>
              </div>
              {latestHealthScore?.classification && (
                <p className="text-[11px] text-slate-500 font-bold uppercase tracking-widest leading-tight mt-1 truncate">
                  {latestHealthScore.classification}
                </p>
              )}
            </div>
          </div>

          <div className="w-full flex justify-end mt-2 relative z-10">
            <TooltipProvider>
              <Tooltip delayDuration={300}>
                <TooltipTrigger asChild>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation()
                      handleGenerateShadowScore()
                    }}
                    disabled={generating}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white h-7 w-7 p-0 rounded-lg shadow-xl transition-all hover:scale-110 active:scale-95"
                  >
                    {generating ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3.5 h-3.5" />}
                  </Button>
                </TooltipTrigger>
                <TooltipContent side="top" className="bg-slate-900 border-white/10 text-white">
                  <p className="text-[10px] font-bold uppercase">Analisar com IA</p>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
          </div>
        </div>

        {/* Gauges de saúde + NPS + SLA + Score IA
            Mobile: 3 cols (linha 1: Adoção|Suporte|Relacionamento, linha 2: NPS|SLA|IA)
            SM+: mesma estrutura 3x2
        */}
        <div className="lg:col-span-3 glass-card p-4 grid grid-cols-3 gap-4 items-center border-plannera-sop/10">
          <HealthMiniGauge index={0} label="Adoção"         value={currentAdoptionScore ?? latestHealthScore?.engagement_component ?? 50} icon={Zap}    color="#2ba09d" />
          <HealthMiniGauge index={1} label="Suporte"        value={latestHealthScore?.ticket_component     || 50} icon={Ticket} color="#f8b967" />
          <HealthMiniGauge index={2} label="Relacionamento" value={latestHealthScore?.sentiment_component  || 50} icon={Heart}  color="#ea724a" />

          {/* Separador de linha */}
          <div className="col-span-3 h-px bg-white/[0.04]" />

          {/* Linha 2: NPS */}
          <HealthMiniGauge
            index={3}
            label="NPS"
            value={npsScore === null ? 50 : Math.max(0, (npsScore + 100) / 2)}
            icon={MessageSquare}
            color="#818cf8"
            displayLabel={npsScore === null ? '—' : npsScore > 0 ? `+${npsScore}` : String(npsScore)}
          />

          {/* Linha 2: SLA */}
          <HealthMiniGauge
            index={4}
            label="SLA"
            value={slaActive === null ? 50 : slaActive ? 100 : 15}
            icon={slaActive ? ShieldCheck : ShieldOff}
            color={slaActive ? '#2ba09d' : '#6b7280'}
            displayLabel={slaActive === null ? '—' : slaActive ? 'Ativo' : 'Sem SLA'}
          />

          {/* Linha 2: Score IA */}
          <div className="flex flex-col items-center gap-2 group">
            {latestHealthScore?.shadow_score != null ? (
              <>
                <div className="w-12 h-12 rounded-2xl border border-plannera-orange/20 bg-plannera-orange/5 flex items-center justify-center shadow-lg">
                  <Sparkles className="w-5 h-5 text-plannera-orange" />
                </div>
                <div className="text-center">
                  <p className="text-[9px] text-slate-400 uppercase font-extrabold tracking-widest leading-none mb-1">Score IA</p>
                  <div className="flex items-center gap-1 justify-center">
                    <span className="text-sm font-bold text-plannera-orange leading-none tracking-tight">
                      {Math.round(latestHealthScore.shadow_score)}
                    </span>
                    {latestHealthScore.shadow_reasoning && (
                      <button
                        onClick={() => setShowReasoning(!showReasoning)}
                        className="text-slate-600 hover:text-plannera-orange transition-colors"
                      >
                        <Info className="w-3 h-3" />
                      </button>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <>
                <div className="w-12 h-12 rounded-2xl border border-white/5 bg-white/5 flex items-center justify-center opacity-30">
                  <Sparkles className="w-5 h-5 text-slate-400" />
                </div>
                <div className="text-center opacity-30">
                  <p className="text-[9px] text-slate-400 uppercase font-extrabold tracking-widest leading-none mb-1">Score IA</p>
                  <p className="text-[10px] italic text-slate-500 font-bold">Pendente</p>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {showReasoning && latestHealthScore?.shadow_reasoning && (
        <motion.div
          initial={{ opacity: 0, height: 0 }}
          animate={{ opacity: 1, height: 'auto' }}
          exit={{ opacity: 0, height: 0 }}
          className="bg-indigo-600/5 border border-indigo-500/20 rounded-2xl p-6 relative overflow-hidden"
        >
          <div className="absolute top-0 left-0 w-1 h-full bg-indigo-500" />
          <div className="flex items-center gap-2 mb-2">
            <Settings2 className="w-4 h-4 text-indigo-400" />
            <span className="text-[10px] text-indigo-400 uppercase font-black tracking-widest">Raciocínio Estratégico IA</span>
          </div>
          <p className="text-slate-300 text-sm italic leading-relaxed">
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
