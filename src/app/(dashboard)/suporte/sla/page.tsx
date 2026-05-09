'use client'

import { useState, useEffect } from 'react'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { Clock, CheckCircle2, AlertTriangle, Star, ArrowLeft } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { 
  ResponsiveContainer, 
  BarChart, 
  CartesianGrid, 
  XAxis, 
  YAxis, 
  Tooltip, 
  Bar, 
  Cell, 
  PieChart, 
  Pie, 
  Legend 
} from 'recharts'

export default function SLADashboard() {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetch('/api/support-tickets/stats/sla')
      .then(res => res.json())
      .then(json => {
        setData(json)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error fetching SLA stats:', err)
        setLoading(false)
      })
  }, [])

  if (loading) {
    return (
      <div className="h-[80vh] flex flex-col items-center justify-center gap-6">
        <div className="relative">
          <div className="w-16 h-16 border-4 border-plannera-orange/20 border-t-plannera-orange rounded-full animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="w-8 h-8 border-4 border-plannera-primary/20 border-t-plannera-primary rounded-full animate-spin-slow" />
          </div>
        </div>
        <p className="text-[10px] font-black text-content-primary uppercase tracking-[0.3em] animate-pulse">Compilando Inteligência SLA...</p>
      </div>
    )
  }

  const COLORS = ['#f7941e', '#3a4c8a', '#d85d4b', '#64748b']
  const PIE_COLORS = ['#10b981', '#ef4444']

  const pieData = [
    { name: 'Dentro do Prazo', value: data?.summary?.first_response_met_pct || 100 },
    { name: 'Violados', value: 100 - (data?.summary?.first_response_met_pct || 100) }
  ]

  return (
    <div className="p-8 space-y-10 max-w-[1600px] mx-auto animate-in fade-in slide-in-from-bottom-4 duration-1000">
      <ModuleHeader 
        title="Control Tower SLA"
        subtitle="Portfolio Intelligence & Operational Excellence"
      />

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCardPremium 
          title="Achievement Rate" 
          value={`${data?.summary?.first_response_met_pct.toFixed(1)}%`} 
          status="Primeira Resposta"
          icon={Clock}
          trend={{ value: '2.4', isPositive: true }}
          colorVariant="sop"
        />
        <StatCardPremium 
          title="Resolution Rate" 
          value={`${data?.summary?.resolution_met_pct.toFixed(1)}%`} 
          status="Resolução Final"
          icon={CheckCircle2}
          trend={{ value: '0.5', isPositive: false }}
          colorVariant="emerald"
        />
        <StatCardPremium 
          title="Open Violations" 
          value={data?.summary?.breached_total || 0} 
          status="Ação Imediata"
          icon={AlertTriangle}
          colorVariant="destructive"
        />
        <StatCardPremium 
          title="Average CSAT" 
          value={data?.summary?.avg_csat || '—'} 
          status="Satisfação Global"
          icon={Star}
          colorVariant="orange"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-8">
        <div className="xl:col-span-2 bg-surface-card border border-border-divider rounded-2xl p-8 shadow-2xl backdrop-blur-md">
          <div className="flex items-center justify-between mb-8">
            <div>
              <h2 className="text-sm font-black uppercase tracking-widest text-content-primary">Performance por Prioridade</h2>
              <p className="text-[10px] font-bold text-content-secondary uppercase tracking-widest mt-1 opacity-60">Conformidade por nível de serviço</p>
            </div>
          </div>
          <div className="h-[350px] w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.priority_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" vertical={false} />
                <XAxis 
                  dataKey="priority" 
                  stroke="rgba(255,255,255,0.2)" 
                  fontSize={10} 
                  fontWeight="900" 
                  tickFormatter={(val) => val.toUpperCase()} 
                  dy={10}
                />
                <YAxis stroke="rgba(255,255,255,0.2)" fontSize={10} fontWeight="900" />
                <Tooltip 
                  cursor={{ fill: 'rgba(255,255,255,0.03)' }}
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(12px)' }}
                />
                <Bar 
                  dataKey="pct" 
                  name="SLA %" 
                  radius={[12, 12, 0, 0]}
                  animationDuration={2000}
                >
                  {data?.priority_breakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="bg-surface-card border border-border-divider rounded-2xl p-8 shadow-2xl backdrop-blur-md flex flex-col">
          <div className="mb-8">
            <h2 className="text-sm font-black uppercase tracking-widest text-content-primary">Status de Saúde</h2>
            <p className="text-[10px] font-bold text-content-secondary uppercase tracking-widest mt-1 opacity-60">Proporção total de atendimento</p>
          </div>
          <div className="flex-1 min-h-[300px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  innerRadius={85}
                  outerRadius={120}
                  paddingAngle={10}
                  dataKey="value"
                  animationDuration={2000}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: 'rgba(15, 23, 42, 0.9)', border: '1px solid rgba(255,255,255,0.1)', borderRadius: '16px', backdropFilter: 'blur(12px)' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ paddingTop: '20px', fontSize: '9px', textTransform: 'uppercase', fontWeight: '900', letterSpacing: '0.1em' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Breaches */}
      <div className="bg-surface-card border border-border-divider rounded-2xl p-8 shadow-2xl backdrop-blur-md">
        <div className="flex items-center justify-between mb-10">
          <div>
            <h2 className="text-sm font-black uppercase tracking-widest text-content-primary">Alertas de Violação</h2>
            <p className="text-[10px] font-bold text-content-secondary uppercase tracking-widest mt-1 opacity-60">Incidentes críticos pendentes</p>
          </div>
          <Button variant="outline" className="h-11 rounded-xl px-6 border-border-divider hover:bg-white/5 text-[10px] font-black uppercase tracking-widest transition-all">
            Exportar Deep Audit
          </Button>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {data?.recent_breaches.length === 0 ? (
            <div className="col-span-full py-20 flex flex-col items-center justify-center opacity-20 grayscale">
              <CheckCircle2 className="w-12 h-12 mb-4" />
              <p className="text-[10px] font-black uppercase tracking-widest">Nenhuma violação detectada no portfolio</p>
            </div>
          ) : (
            data?.recent_breaches.map((t: any) => (
              <div key={t.id} className="group flex items-center justify-between p-6 rounded-2xl bg-surface-background/50 border border-border-divider hover:border-red-500/30 transition-all">
                <div className="flex items-center gap-5">
                  <div className="w-14 h-14 rounded-2xl bg-red-500/10 flex items-center justify-center group-hover:scale-110 transition-transform">
                    <AlertTriangle className="w-6 h-6 text-red-500" />
                  </div>
                  <div>
                    <h4 className="text-xs font-black uppercase tracking-tight text-content-primary">{t.title}</h4>
                    <div className="flex items-center gap-3 mt-1.5">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-content-secondary opacity-60">Prioridade {t.priority}</span>
                      <div className="w-1 h-1 bg-content-secondary opacity-20 rounded-full" />
                      <span className="text-[9px] font-bold uppercase tracking-widest text-red-500/60">Violado</span>
                    </div>
                  </div>
                </div>
                <Button variant="ghost" size="icon" className="w-10 h-10 rounded-xl bg-surface-card border border-border-divider hover:bg-white/5 text-content-secondary opacity-60 hover:opacity-100 transition-all">
                  <ArrowLeft className="w-4 h-4 rotate-180" />
                </Button>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  )
}

