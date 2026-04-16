'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent } from '@/components/ui/card'
import { Loader2, Zap, Rocket, AlertTriangle, Target, ChevronRight, HelpCircle, Clock, PieChart, CircleSlash, ShieldAlert, ShieldCheck, TrendingDown, Info } from 'lucide-react'
import { AdoptionDetailsModal } from './AdoptionDetailsModal'
import { Progress } from '@/components/ui/progress'
import { Badge } from '@/components/ui/badge'

interface AdoptionRecord {
  id: string
  status: 'not_started' | 'partial' | 'in_use' | 'blocked' | 'na'
  action_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  action_plan: string | null
  blocker_category: string | null
  product_features: {
    name: string
    module: string
  }
}

export function AdoptionExecutiveSection({ accountId, accountName }: { accountId: string, accountName: string }) {
  const [data, setData] = useState<AdoptionRecord[]>([])
  const [planSummary, setPlanSummary] = useState<{
    plan_name: string;
    risk_level: 'high' | 'low' | 'none';
    at_risk_features: string[];
  } | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchAdoption()
  }, [])

  async function fetchAdoption() {
    try {
      const res = await fetch(`/api/accounts/${accountId}/adoption`)
      if (res.ok) {
        const json = await res.json()
        setData(json.adoption || [])
        setPlanSummary(json.plan_summary)
      }
    } catch (e) {
      console.error(e)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <Card className="glass-card border-none shadow-xl h-40 flex items-center justify-center">
        <Loader2 className="w-5 h-5 animate-spin text-plannera-operations" />
      </Card>
    )
  }

  const total = data.length
  const inUse = data.filter(r => r.status === 'in_use').length
  const partial = data.filter(r => r.status === 'partial').length
  const blocked = data.filter(r => r.status === 'blocked').length
  const notApplicable = data.filter(r => r.status === 'na').length
  
  // Ações pendentes: qualquer ação que não esteja 'completed' em itens não adotados plenamente
  const pendingActions = data.filter(r => r.status !== 'in_use' && r.status !== 'na' && r.action_status !== 'completed').length

  // Categorias de bloqueio para o resumo visual
  const blocksByCategory = data.reduce((acc: Record<string, number>, r) => {
    if (r.status === 'blocked' && r.blocker_category) {
      acc[r.blocker_category] = (acc[r.blocker_category] || 0) + 1
    }
    return acc
  }, {})

  // Nova Fórmula: Bloqueado conta NEGATIVAMENTE (fica no denominador)
  // Apenas NA é excluído do potencial
  const totalExcluded = notApplicable
  const totalApplicable = total - totalExcluded
  
  const percentage = totalApplicable > 0 
    ? Math.round(((inUse + (partial * 0.5)) / totalApplicable) * 100) 
    : 0

  return (
    <Card className="glass-card border-none shadow-2xl relative overflow-hidden group">
      {/* Background Decor */}
      <div className="absolute -right-10 -top-10 w-40 h-40 bg-plannera-operations/5 blur-3xl rounded-full" />
      
      <CardContent className="p-6 space-y-6 relative">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-plannera-operations/10 border border-plannera-operations/20">
              <Zap className="w-5 h-5 text-plannera-operations" />
            </div>
            <div className="space-y-0.5">
              <div className="flex items-center gap-2">
                <h3 className="text-white text-sm font-black uppercase tracking-widest leading-none">Adoção Funcional</h3>
                {planSummary && (
                  <Badge className="bg-white/5 text-slate-400 border-none text-[8px] font-black uppercase tracking-tighter h-4 px-2">
                    Plano: {planSummary.plan_name}
                  </Badge>
                )}
              </div>
              <p className="text-slate-500 text-[9px] font-bold uppercase tracking-tight">Utilização contratual do produto</p>
            </div>
          </div>
          <AdoptionDetailsModal accountId={accountId} accountName={accountName} />
        </div>

        {total === 0 ? (
          <div className="py-8 text-center border border-dashed border-white/5 rounded-2xl">
            <p className="text-slate-600 text-[10px] font-bold uppercase tracking-widest italic">Nenhum plano configurado no contrato.</p>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-2 lg:grid-cols-5 gap-2">
              <div className="bg-white/[0.02] p-2.5 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-white/[0.04]">
                <span className="text-slate-500 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Target className="w-3 h-3 text-plannera-ds shrink-0" /> Total
                </span>
                <p className="text-white text-2xl font-black leading-none">{total}</p>
              </div>

              <div className="bg-white/[0.02] p-2.5 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-white/[0.04]">
                <span className="text-emerald-500/80 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <Rocket className="w-3 h-3 shrink-0" /> Adotadas
                </span>
                <p className="text-white text-2xl font-black leading-none">{inUse}</p>
              </div>

              <div className="bg-white/[0.02] p-2.5 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-white/[0.04]">
                <span className="text-slate-500 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                   <PieChart className="w-3 h-3 text-plannera-operations/60 shrink-0" /> Parcial
                </span>
                <p className="text-white text-2xl font-black leading-none">{partial}</p>
              </div>

              <div className="bg-white/[0.02] p-2.5 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-white/[0.04]">
                <span className="text-plannera-demand text-[8px] font-bold uppercase tracking-wider flex items-center gap-1 relative">
                  <AlertTriangle className="w-3 h-3 text-red-500 shrink-0" /> Bloqueio
                  {data.some(r => r.status === 'blocked' && r.action_plan) && (
                    <Clock className="w-2.5 h-2.5 text-amber-500 animate-pulse absolute -right-3 -top-1" />
                  )}
                </span>
                <p className="text-white text-2xl font-black leading-none">{blocked}</p>
              </div>

              <div className="bg-white/[0.02] p-2.5 rounded-2xl border border-white/5 flex flex-col items-center justify-center gap-1.5 min-h-[85px] transition-colors hover:bg-white/[0.04]">
                <span className="text-slate-500/60 text-[8px] font-bold uppercase tracking-wider flex items-center gap-1">
                  <CircleSlash className="w-3 h-3 shrink-0" /> N/A
                </span>
                <p className="text-white text-2xl font-black leading-none">{notApplicable}</p>
              </div>
            </div>

            {/* Downgrade Risk Panel */}
            {planSummary && planSummary.risk_level !== 'none' && (
              <div className={`p-4 rounded-2xl border animate-in fade-in slide-in-from-top-2 duration-500 ${
                planSummary.risk_level === 'high' 
                  ? 'bg-red-500/10 border-red-500/20 shadow-[0_0_20px_rgba(239,68,68,0.1)]' 
                  : 'bg-amber-500/10 border-amber-500/20 shadow-[0_0_20px_rgba(245,158,11,0.1)]'
              }`}>
                <div className="flex items-start gap-4">
                  <div className={`p-2 rounded-xl shrink-0 ${
                    planSummary.risk_level === 'high' ? 'bg-red-500/20' : 'bg-amber-500/20'
                  }`}>
                    {planSummary.risk_level === 'high' 
                      ? <ShieldAlert className="w-5 h-5 text-red-500" />
                      : <TrendingDown className="w-5 h-5 text-amber-500" />
                    }
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center justify-between">
                      <h4 className={`text-[11px] font-black uppercase tracking-widest ${
                        planSummary.risk_level === 'high' ? 'text-red-400' : 'text-amber-400'
                      }`}>
                        {planSummary.risk_level === 'high' ? 'Risco Crítico de Downgrade' : 'Atenção Commercial: Risco de Downgrade'}
                      </h4>
                      <Badge variant="outline" className={`text-[8px] border-none uppercase font-black ${
                        planSummary.risk_level === 'high' ? 'bg-red-500/20 text-red-200' : 'bg-amber-500/20 text-amber-200'
                      }`}>
                        Impacto Comercial: {planSummary.risk_level === 'high' ? 'Alto' : 'Médio'}
                      </Badge>
                    </div>
                    <p className="text-white/60 text-[10px] leading-relaxed font-medium">
                      {planSummary.risk_level === 'high' 
                        ? 'O cliente não está utilizando as funcionalidades que justificam o investimento no plano Professional/Essential. Risco imediato de redução de contrato.' 
                        : 'Adoção parcial das funcionalidades exclusivas do plano atual. É necessário reforçar o valor estratégico para evitar questionamentos na renovação.'}
                    </p>
                    <div className="flex flex-wrap gap-2 pt-1">
                      {planSummary.at_risk_features.map((feat, i) => (
                        <div key={i} className="flex items-center gap-1.5 bg-black/20 px-2 py-1 rounded-lg border border-white/5">
                           <div className={`w-1 h-1 rounded-full ${planSummary.risk_level === 'high' ? 'bg-red-500' : 'bg-amber-500'}`} />
                           <span className="text-[9px] font-bold text-white/80 uppercase tracking-tight">{feat}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            )}

            <div className="space-y-4 pt-2">
              <div className="space-y-3">
                <div className="flex items-center justify-between text-[10px] font-bold uppercase tracking-widest">
                  <span className="text-slate-400">Score de Adoção Real</span>
                  <div className="flex items-center gap-3">
                    <span className="text-slate-600 font-black">{inUse}/{totalApplicable}</span>
                    <span className="text-plannera-operations">{percentage}%</span>
                  </div>
                </div>
                <div className="relative h-2.5 w-full bg-white/5 rounded-full overflow-hidden">
                  <div 
                    className="absolute top-0 left-0 h-full bg-gradient-to-r from-plannera-operations to-emerald-500 transition-all duration-1000 shadow-[0_0_10px_rgba(52,211,153,0.3)]"
                    style={{ width: `${percentage}%` }}
                  />
                </div>
              </div>

              {blocked > 0 && (
                <div className="p-3 rounded-xl bg-red-500/5 border border-red-500/10 space-y-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-3 h-3 text-red-500" />
                    <span className="text-[9px] font-black uppercase text-red-400 tracking-tight">
                      Principais Barreiras à Adoção Plena:
                    </span>
                  </div>
                  <div className="space-y-2 max-h-[120px] overflow-y-auto pr-2 custom-scrollbar">
                    {data.filter(r => r.status === 'blocked').map((r, idx) => (
                      <div key={idx} className="flex flex-col gap-0.5 border-l-2 border-red-500/20 pl-3 py-1">
                        <span className="text-white text-[10px] font-bold uppercase tracking-tight">{r.product_features.name}</span>
                        <span className="text-slate-500 text-[8px] font-medium italic">
                          {r.action_plan || 'Nenhum plano de ação registrado'}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </CardContent>
    </Card>
  )
}

function CheckCircle2(props: any) {
  return (
    <svg
      {...props}
      xmlns="http://www.w3.org/2000/svg"
      width="24"
      height="24"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M12 22c5.523 0 10-4.477 10-10S17.523 2 12 2 2 6.477 2 12s4.477 10 10 10z" />
      <path d="m9 12 2 2 4-4" />
    </svg>
  )
}
