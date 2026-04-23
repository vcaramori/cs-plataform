'use client'

import { useState, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { 
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, 
  PieChart, Pie, Cell, Legend 
} from 'recharts'
import { 
  TicketCheck, AlertTriangle, CheckCircle2, 
  Clock, TrendingUp, ArrowLeft, Loader2, Star
} from 'lucide-react'
import Link from 'next/link'
import { cn } from '@/lib/utils'

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
      <div className="h-[80vh] flex flex-col items-center justify-center gap-4">
        <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
        <p className="text-sm font-bold text-slate-500 uppercase tracking-widest">Compilando Inteligência SLA...</p>
      </div>
    )
  }

  const COLORS = ['#f7941e', '#3a4c8a', '#d85d4b', '#64748b']
  const PIE_COLORS = ['#10b981', '#ef4444'] // Success vs Danger

  const pieData = [
    { name: 'Dentro do Prazo', value: data?.summary?.first_response_met_pct || 100 },
    { name: 'Violados', value: 100 - (data?.summary?.first_response_met_pct || 100) }
  ]

  return (
    <div className="p-6 space-y-8 max-w-[1600px] mx-auto animate-in fade-in duration-700">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <Link href="/suporte" className="p-2 rounded-full hover:bg-white/5 transition-all text-slate-500 hover:text-white">
            <ArrowLeft className="w-5 h-5" />
          </Link>
          <div>
            <h1 className="h1-page">Control Tower SLA</h1>
            <p className="label-premium flex items-center gap-2">
              Portfolio Intelligence & Operational Excellence
            </p>
          </div>
        </div>
        
        <div className="flex items-center gap-3">
           <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-900/20 dark:text-emerald-400 dark:border-emerald-900 px-4 py-1.5 rounded-full font-black text-[10px] tracking-widest uppercase">
             Health: Stability
           </Badge>
        </div>
      </div>

      {/* KPI Row */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <KpiCard 
          title="Achievement rate" 
          value={`${data?.summary?.first_response_met_pct.toFixed(1)}%`} 
          label="Primeira Resposta"
          icon={<Clock className="w-4 h-4" />}
          trend="+2.4%"
          color="indigo"
        />
        <KpiCard 
          title="Resolution Rate" 
          value={`${data?.summary?.resolution_met_pct.toFixed(1)}%`} 
          label="Resolução Final"
          icon={<CheckCircle2 className="w-4 h-4" />}
          trend="-0.5%"
          color="emerald"
        />
        <KpiCard 
          title="Open Violations" 
          value={data?.summary?.breached_total || 0} 
          label="Ação Imediata"
          icon={<AlertTriangle className="w-4 h-4" />}
          color="orange"
          isBad
        />
        <KpiCard 
          title="Average CSAT" 
          value={data?.summary?.avg_csat || '—'} 
          label="Satisfação Global"
          icon={<Star className="w-4 h-4" />}
          color="amber"
        />
      </div>

      {/* Charts Row */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Priority Breakdown */}
        <Card className="xl:col-span-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-3xl">
          <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
            <div>
              <CardTitle className="h2-section !text-[#2d3558] dark:!text-white">Performance por Prioridade</CardTitle>
              <p className="label-premium !text-[9px] opacity-60">Percentual de conformidade por nível de sla</p>
            </div>
          </CardHeader>
          <CardContent className="px-0 pt-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={data?.priority_breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
                <XAxis 
                  dataKey="priority" 
                  stroke="#64748b" 
                  fontSize={10} 
                  fontWeight="bold" 
                  tickFormatter={(val) => val.toUpperCase()} 
                />
                <YAxis stroke="#64748b" fontSize={10} fontWeight="bold" />
                <Tooltip 
                  cursor={{ fill: '#f1f5f9' }}
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                />
                <Bar 
                  dataKey="pct" 
                  name="SLA %" 
                  radius={[8, 8, 0, 0]}
                  animationDuration={1500}
                >
                  {data?.priority_breakdown.map((entry: any, index: number) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>

        {/* Global Distribution Pie */}
        <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-3xl">
          <CardHeader className="px-0 pt-0">
            <CardTitle className="h2-section !text-[#2d3558] dark:!text-white">Status de Saúde</CardTitle>
            <p className="label-premium !text-[9px] opacity-60">Proporção total de atendimento</p>
          </CardHeader>
          <CardContent className="px-0 pt-6 h-[350px]">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="45%"
                  innerRadius={80}
                  outerRadius={110}
                  paddingAngle={8}
                  dataKey="value"
                  animationDuration={1500}
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={PIE_COLORS[index % PIE_COLORS.length]} stroke="none" />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ backgroundColor: '#ffffff', border: '1px solid #e2e8f0', borderRadius: '12px', color: '#0f172a' }}
                />
                <Legend 
                  verticalAlign="bottom" 
                  align="center"
                  wrapperStyle={{ paddingTop: '20px', fontSize: '10px', textTransform: 'uppercase', fontWeight: 'bold' }}
                />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Breaches */}
      <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-3xl overflow-hidden">
        <CardHeader className="px-0 pt-0 flex flex-row items-center justify-between">
           <div>
              <CardTitle className="text-slate-900 dark:text-white text-lg font-black uppercase tracking-tight">Alertas de Violação</CardTitle>
              <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-1">Top 10 incidentes recentes fora do prazo</p>
           </div>
           <Button variant="outline" className="h-8 text-[9px] font-black uppercase tracking-widest border-slate-200">
             Exportar Relatório
           </Button>
        </CardHeader>
        <CardContent className="px-0 pt-6">
          <div className="space-y-3">
            {data?.recent_breaches.length === 0 ? (
              <div className="text-center py-10 opacity-30">
                <p className="text-xs uppercase font-bold tracking-widest">Nenhuma violação detectada no portfolio.</p>
              </div>
            ) : (
              data?.recent_breaches.map((t: any) => (
                <div key={t.id} className="flex items-center justify-between p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/50 border border-slate-100 dark:border-slate-800">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-xl bg-red-100 dark:bg-red-900/20 flex items-center justify-center">
                      <AlertTriangle className="w-5 h-5 text-red-600 dark:text-red-500" />
                    </div>
                    <div>
                      <h4 className="text-slate-900 dark:text-white text-sm font-bold">{t.title}</h4>
                      <p className="text-slate-500 text-[10px] font-bold uppercase tracking-widest mt-0.5">Prioridade: {t.priority}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <Badge className="bg-red-100 text-red-700 border-none text-[9px] font-black uppercase tracking-widest">
                      Violado
                    </Badge>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

function KpiCard({ title, value, label, icon, trend, color, isBad }: any) {
  const colorMap: any = {
    indigo: 'from-primary/10 to-transparent text-primary',
    emerald: 'from-emerald-500/10 to-transparent text-emerald-600 dark:text-emerald-400',
    orange: 'from-orange-500/10 to-transparent text-orange-600 dark:text-orange-400',
    amber: 'from-amber-500/10 to-transparent text-amber-600 dark:text-amber-400',
  }

  return (
    <Card className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm border-none rounded-3xl overflow-hidden relative group">
      <div className={cn("absolute inset-0 bg-gradient-to-br opacity-50", colorMap[color])} />
      <CardContent className="p-6 relative z-10">
        <div className="flex justify-between items-start mb-4">
          <div className="p-2.5 rounded-xl bg-white dark:bg-black/40 border border-white/5 text-slate-400 group-hover:text-brand-primary dark:text-white transition-colors">
            {icon}
          </div>
          {trend && (
            <span className={cn(
              "text-[10px] font-black uppercase tracking-widest",
              trend.startsWith('+') ? "text-emerald-400" : "text-red-400"
            )}>
              {trend}
            </span>
          )}
        </div>
        <div className="space-y-1">
          <p className="label-premium !text-[9px] opacity-60">{title}</p>
          <h3 className={cn(
            "text-3xl font-black tracking-tight",
            isBad ? "text-red-600 dark:text-red-500" : "text-brand-primary dark:text-white"
          )}>
            {value}
          </h3>
          <p className="label-premium !text-[9px] opacity-60">{label}</p>
        </div>
      </CardContent>
    </Card>
  )
}

