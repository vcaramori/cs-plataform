'use client'

import { useState } from 'react'
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
  Heart
} from 'lucide-react'
import { toast } from 'sonner'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import { EditAccountDialog } from './EditAccountDialog'
import { format, differenceInDays } from 'date-fns'
import { ptBR } from 'date-fns/locale'

function HealthMiniGauge({ label, value, icon: Icon, color }: { label: string, value: number, icon: any, color: string }) {
  return (
    <div className="flex flex-col items-center gap-1 group">
      <div className={`w-10 h-10 rounded-full border-2 border-slate-800 flex items-center justify-center relative overflow-hidden bg-slate-950`}>
        <div 
          className="absolute bottom-0 left-0 w-full transition-all duration-1000" 
          style={{ height: `${value}%`, backgroundColor: color, opacity: 0.15 }} 
        />
        <Icon className="w-4 h-4 relative z-10" style={{ color }} />
      </div>
      <span className="text-[10px] text-slate-500 uppercase font-black tracking-tighter">{label}</span>
      <span className="text-xs font-bold text-white leading-none">{Math.round(value)}%</span>
    </div>
  )
}

export function AccountHeader({ account, latestHealthScore }: {
  account: any
  latestHealthScore?: any
}) {
  const router = useRouter()
  const [generating, setGenerating] = useState(false)
  const [showReasoning, setShowReasoning] = useState(false)

  async function handleGenerateShadowScore() {
    setGenerating(true)
    try {
      const res = await fetch('/api/health-scores/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ account_id: account.id }),
      })
      const data = await res.json()
      if (!res.ok) { toast.error(data.error ?? 'Erro ao gerar Shadow Score'); return }
      toast.success(`Shadow Score gerado: ${data.shadow_score}`)
      router.refresh()
    } finally {
      setGenerating(false)
    }
  }

  // Cálculos Financeiros
  const activeContract = account.contracts?.find((c: any) => c.status === 'active') || account.contracts?.[0]
  const renewalDate = activeContract?.renewal_date ? new Date(activeContract.renewal_date + 'T12:00:00') : null
  const daysToRenewal = renewalDate ? differenceInDays(renewalDate, new Date()) : null
  
  const renewalColor = !daysToRenewal ? 'text-slate-500' :
    daysToRenewal < 30 ? 'text-red-400 font-black' :
    daysToRenewal < 90 ? 'text-amber-400' : 'text-emerald-400'

  const trendIcon = {
    up: <TrendingUp className="w-5 h-5 text-emerald-400 animate-pulse" />,
    down: <TrendingDown className="w-5 h-5 text-red-400 animate-pulse" />,
    critical: <AlertTriangle className="w-5 h-5 text-red-500" />,
    stable: <Minus className="w-5 h-5 text-slate-400" />,
  }[account.health_trend] ?? <Minus className="w-5 h-5 text-slate-400" />

  return (
    <div className="flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="text-slate-500 hover:text-white bg-slate-900 border border-slate-800">
              <ArrowLeft className="w-4 h-4 mr-2" /> Voltar
            </Button>
          </Link>
          <div className="flex items-center gap-3">
            <h1 className="text-3xl font-black text-white tracking-tight">{account.name}</h1>
            <Badge className="bg-indigo-500/10 text-indigo-400 border-indigo-500/20 px-3 py-1 font-bold uppercase tracking-widest text-[10px]">
              {account.segment}
            </Badge>
            <EditAccountDialog account={account} />
          </div>
        </div>

        {/* Financial Quick Stats */}
        <div className="flex items-center gap-3">
           <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-2xl">
            <div className="w-8 h-8 rounded-lg bg-emerald-500/10 flex items-center justify-center">
              <DollarSign className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black">MRR</span>
              <span className="text-sm font-bold text-white">R$ {Number(activeContract?.mrr || 0).toLocaleString('pt-BR')}</span>
            </div>
          </div>

          <div className="bg-slate-900 border border-slate-800 rounded-xl px-4 py-2 flex items-center gap-3 shadow-2xl">
            <div className="w-8 h-8 rounded-lg bg-blue-500/10 flex items-center justify-center">
              <Calendar className="w-4 h-4 text-blue-400" />
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-black">Renovação</span>
              <span className={`text-sm font-bold ${renewalColor}`}>
                {daysToRenewal !== null ? (daysToRenewal < 0 ? 'Expirado' : `em ${daysToRenewal} dias`) : 'N/A'}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-4">
        {/* Health Score Main Card */}
        <div className="lg:col-span-1 bg-slate-900 border border-slate-800 rounded-2xl p-4 flex items-center justify-between relative overflow-hidden group">
          <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
            <Zap className="w-20 h-20 text-indigo-400" />
          </div>
          <div className="flex items-center gap-4 relative z-10">
            <div className="relative flex items-center justify-center">
              <svg className="w-16 h-16 -rotate-90">
                <circle cx="32" cy="32" r="28" fill="none" stroke="#1e293b" strokeWidth="6" />
                <circle 
                  cx="32" cy="32" r="28" fill="none" 
                  stroke={account.health_score >= 70 ? '#10b981' : account.health_score >= 40 ? '#f59e0b' : '#ef4444'} 
                  strokeWidth="6"
                  strokeDasharray={`${(account.health_score / 100) * 176} 176`}
                  strokeLinecap="round"
                />
              </svg>
              <span className="absolute text-xl font-black text-white">{Math.round(account.health_score)}</span>
            </div>
            <div className="flex flex-col">
              <span className="text-[10px] text-slate-500 uppercase font-bold tracking-widest">Dashboard Health</span>
              <div className="flex items-center gap-1.5">
                {trendIcon}
                <span className="text-sm font-bold text-white capitalize">{account.health_trend}</span>
              </div>
            </div>
          </div>
          
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={handleGenerateShadowScore}
                  disabled={generating}
                  className="bg-indigo-600/10 hover:bg-indigo-600 text-indigo-400 hover:text-white h-8 w-8 p-0 rounded-lg relative z-10"
                >
                  {generating ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                </Button>
              </TooltipTrigger>
              <TooltipContent className="bg-slate-800 border-slate-700 text-white">
                <p>Recalcular via Cloud Intelligence</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>

        {/* Health Components / Mini-Indicators */}
        <div className="lg:col-span-3 bg-slate-900 border border-slate-800 rounded-2xl p-4 grid grid-cols-3 md:grid-cols-4 gap-4 items-center">
          <HealthMiniGauge 
            label="Adoção" 
            value={latestHealthScore?.engagement_component || 50} 
            icon={Zap} 
            color="#38bdf8" 
          />
          <HealthMiniGauge 
            label="Suporte" 
            value={latestHealthScore?.ticket_component || 50} 
            icon={Ticket} 
            color="#f87171" 
          />
          <HealthMiniGauge 
            label="Relacionamento" 
            value={latestHealthScore?.sentiment_component || 50} 
            icon={Heart} 
            color="#fbbf24" 
          />
          
          <div className="hidden md:flex flex-col justify-center border-l border-slate-800 pl-6 h-10">
            {latestHealthScore?.shadow_score != null && (
              <div className="flex flex-col">
                <span className="text-[10px] text-slate-500 uppercase font-black tracking-widest leading-none mb-1">Shadow Score (IA)</span>
                <div className="flex items-center gap-2">
                  <span className="text-lg font-black text-indigo-400">{Math.round(latestHealthScore.shadow_score)}</span>
                  {latestHealthScore.shadow_reasoning && (
                    <button 
                      onClick={() => setShowReasoning(!showReasoning)}
                      className="text-slate-500 hover:text-indigo-400 transition-colors"
                    >
                      <Info className="w-3 h-3" />
                    </button>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

       {showReasoning && latestHealthScore?.shadow_reasoning && (
          <div className="bg-indigo-950/20 border border-indigo-500/20 rounded-xl p-4 mt-2 animate-in fade-in slide-in-from-top-2">
            <p className="text-indigo-300 text-xs italic leading-relaxed">
              &quot;{latestHealthScore.shadow_reasoning}&quot;
            </p>
          </div>
        )}
    </div>
  )
}
