'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  TicketCheck, AlertTriangle, Clock, CheckCircle2, Download,
  Users, Building2, RefreshCw, ShieldCheck, Star
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { motion } from 'framer-motion'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

type Period = '7d' | '30d' | '90d'

interface OperationalData {
  open_now: number
  sla_breached: number
  sla_attention: number
  awaiting_close: number
}

interface PeriodData {
  tickets_received: number
  tickets_resolved: number
  reopened: number
  sla_first_response_compliance_pct: number | null
  sla_resolution_compliance_pct: number | null
  avg_first_response_minutes: number | null
  avg_resolution_minutes: number | null
  avg_csat: number | null
}

interface AgentRow {
  agent_id: string
  received: number
  resolved: number
  fr_compliance_pct: number | null
  res_compliance_pct: number | null
  avg_csat: number | null
  avg_resolution_minutes: number | null
}

interface ClientRow {
  account_id: string
  account_name: string
  tickets: number
  critical_tickets: number
  res_compliance_pct: number | null
  avg_resolution_minutes: number | null
  avg_csat: number | null
}

function kpiDateRange(period: Period) {
  const now = new Date()
  const from = new Date()
  if (period === '7d') from.setDate(now.getDate() - 7)
  else if (period === '30d') from.setDate(now.getDate() - 30)
  else from.setDate(now.getDate() - 90)
  return { dateFrom: from.toISOString(), dateTo: now.toISOString() }
}

function formatMinutes(mins: number | null) {
  if (mins === null) return '—'
  if (mins < 60) return `${mins}m`
  return `${Math.floor(mins / 60)}h ${mins % 60}m`
}

function CompliancePill({ value }: { value: number | null }) {
  if (value === null) return <span className="text-content-secondary font-mono font-extrabold text-[10px]">——</span>
  const color = value >= 90 ? 'text-emerald-600 dark:text-emerald-400' : value >= 70 ? 'text-amber-600 dark:text-amber-400' : 'text-red-600 dark:text-red-400'
  return <span className={cn('font-mono font-extrabold text-[10px]', color)}>{value}%</span>
}

export default function SupportDashboardPage() {
  const [period, setPeriod] = useState<Period>('30d')
  const [operational, setOperational] = useState<OperationalData | null>(null)
  const [periodData, setPeriodData] = useState<PeriodData | null>(null)
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const { dateFrom, dateTo } = kpiDateRange(period)
    const qs = `date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`

    const [op, pd, ag, cl] = await Promise.all([
      fetch('/api/support-dashboard/operational').then(r => r.json()),
      fetch(`/api/support-dashboard/period?${qs}`).then(r => r.json()),
      fetch(`/api/support-dashboard/by-agent?${qs}`).then(r => r.json()),
      fetch(`/api/support-dashboard/by-client?${qs}`).then(r => r.json()),
    ])

    setOperational(op)
    setPeriodData(pd)
    setAgents(ag.agents ?? [])
    setClients(cl.clients ?? [])
    setLoading(false)
  }, [period])

  useEffect(() => { load() }, [load])

  const handleExport = () => {
    const { dateFrom, dateTo } = kpiDateRange(period)
    window.open(`/api/support-reports/export?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`)
  }

  return (
    <PageContainer>
      <ModuleHeader 
        title="Painel Tático de Suporte" 
        subtitle="Métricas de Atendimento, Compliance de SLA e Satisfação do Cliente"
        iconName="TicketCheck"
      >
        <div className="flex bg-surface-background/50 p-1.5 rounded-2xl border border-border-divider shadow-inner mr-4">
          {(['7d', '30d', '90d'] as const).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                "px-5 py-2 rounded-2xl text-[10px] font-black transition-all uppercase tracking-widest",
                period === p 
                  ? "bg-plannera-primary text-white shadow-lg shadow-plannera-primary/20" 
                  : "text-content-secondary hover:text-plannera-primary opacity-60 hover:opacity-100"
              )}
            >
              {p}
            </button>
          ))}
        </div>
        <Button size="sm" onClick={handleExport} className="h-12 bg-emerald-500 hover:bg-emerald-600 text-white rounded-2xl px-6 shadow-xl active:scale-95 transition-all gap-2">
          <Download className="w-4 h-4" />
          <span className="text-[10px] font-black uppercase tracking-widest">Relatório XLSX</span>
        </Button>
      </ModuleHeader>

      {/* Camada 1 — KPIs Operacionais — Premium StatCards */}
      <section className="relative">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-2 h-6 bg-plannera-primary rounded-full shadow-[0_0_15px_rgba(var(--plannera-primary),0.4)]" />
          <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-content-primary">Real-Time Operations</h2>
        </div>
        
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-8">
          <StatCardPremium 
            title="Chamados Abertos"
            value={operational?.open_now ?? 0}
            iconName="TicketCheck"
            colorVariant="sop"
            status="Em fila de triagem"
          />
          <StatCardPremium 
            title="SLA Vencido"
            value={operational?.sla_breached ?? 0}
            iconName="AlertTriangle"
            colorVariant="destructive"
            status="Ação crítica imediata"
          />
          <StatCardPremium 
            title="SLA em Atenção"
            value={operational?.sla_attention ?? 0}
            iconName="Clock"
            colorVariant="orange"
            status="Janela de risco"
          />
          <StatCardPremium 
            title="Aguard. Fechamento"
            value={operational?.awaiting_close ?? 0}
            iconName="CheckCircle2"
            colorVariant="emerald"
            status="Validação pendente"
          />
        </div>
      </section>

      {/* Camada 2 — KPIs do período + gráficos */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-2 h-6 bg-emerald-500 rounded-full shadow-[0_0_15px_rgba(16,185,129,0.4)]" />
          <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-content-primary">Performance Summary</h2>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
          {[
            { label: 'Recebidos', value: periodData?.tickets_received, icon: TicketCheck, color: 'text-plannera-primary' },
            { label: 'Resolvidos', value: periodData?.tickets_resolved, icon: CheckCircle2, color: 'text-emerald-500' },
            { label: 'Compliance SLA', value: periodData?.sla_resolution_compliance_pct != null ? `${periodData.sla_resolution_compliance_pct}%` : '—', icon: ShieldCheck, color: 'text-plannera-orange' },
            { label: 'CSAT Médio', value: periodData?.avg_csat != null ? `${periodData.avg_csat}/5` : '—', icon: Star, color: 'text-amber-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="bg-surface-card border border-border-divider p-8 rounded-2xl shadow-lg hover:border-plannera-primary/20 transition-all group overflow-hidden relative">
              <div className="absolute top-0 left-0 w-1 h-full bg-border-divider group-hover:bg-plannera-primary transition-colors" />
              <div className="flex items-center justify-between mb-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary/40 group-hover:text-content-secondary transition-opacity">{label}</p>
                <Icon className={cn("w-5 h-5 opacity-20 group-hover:opacity-100 transition-all group-hover:scale-110", color)} />
              </div>
              <p className="text-4xl font-black text-content-primary tracking-tighter leading-none tabular-nums">{loading ? '—' : (value ?? 0)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <Card variant="glass" className="p-10 rounded-2xl border-border-divider bg-surface-card/60 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/5 blur-[50px] -mr-10 -mt-10" />
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-content-secondary/50 mb-2">TMP — 1ª Resposta</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-indigo-500 tracking-tighter leading-none tabular-nums">{loading ? '—' : formatMinutes(periodData?.avg_first_response_minutes ?? null)}</p>
                  <span className="text-[10px] font-black text-content-secondary/20 uppercase tracking-widest">Média</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-indigo-500/10 text-indigo-500 shadow-inner group-hover:scale-110 transition-transform">
                <Clock className="w-6 h-6" />
              </div>
            </div>
            {periodData && (
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Média', value: periodData.avg_first_response_minutes ?? 0 }]}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-divider)', borderRadius: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                    <Bar dataKey="value" fill="url(#colorIndigo)" radius={[12, 12, 12, 12]} barSize={80} />
                    <defs>
                      <linearGradient id="colorIndigo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#6366f1" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#6366f1" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>

          <Card variant="glass" className="p-10 rounded-2xl border-border-divider bg-surface-card/60 backdrop-blur-xl shadow-2xl relative overflow-hidden group">
            <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-500/5 blur-[50px] -mr-10 -mt-10" />
            <div className="flex items-center justify-between mb-10">
              <div>
                <p className="text-[11px] font-black uppercase tracking-[0.2em] text-content-secondary/50 mb-2">TMR — Resolução</p>
                <div className="flex items-baseline gap-2">
                  <p className="text-4xl font-black text-emerald-500 tracking-tighter leading-none tabular-nums">{loading ? '—' : formatMinutes(periodData?.avg_resolution_minutes ?? null)}</p>
                  <span className="text-[10px] font-black text-content-secondary/20 uppercase tracking-widest">Média</span>
                </div>
              </div>
              <div className="p-4 rounded-2xl bg-emerald-500/10 text-emerald-500 shadow-inner group-hover:scale-110 transition-transform">
                <CheckCircle2 className="w-6 h-6" />
              </div>
            </div>
            {periodData && (
              <div className="h-[140px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={[{ name: 'Média', value: periodData.avg_resolution_minutes ?? 0 }]}>
                    <XAxis dataKey="name" hide />
                    <YAxis hide />
                    <Tooltip cursor={{fill: 'transparent'}} contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-divider)', borderRadius: '20px', fontSize: '10px', fontWeight: '900', textTransform: 'uppercase' }} />
                    <Bar dataKey="value" fill="url(#colorEmerald)" radius={[12, 12, 12, 12]} barSize={80} />
                    <defs>
                      <linearGradient id="colorEmerald" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#10b981" stopOpacity={1}/>
                        <stop offset="95%" stopColor="#10b981" stopOpacity={0.2}/>
                      </linearGradient>
                    </defs>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            )}
          </Card>
        </div>
      </section>

      {/* Camada 3 — Por Agente */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-2 h-6 bg-plannera-primary rounded-full shadow-[0_0_15px_rgba(var(--plannera-primary),0.4)]" />
          <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-content-primary">Expert Performance</h2>
        </div>

        {loading ? (
          <div className="h-48 w-full animate-pulse bg-surface-card rounded-2xl border border-border-divider" />
        ) : agents.length === 0 ? (
          <Card variant="glass" className="rounded-2xl p-20 text-center border-dashed border-2 border-border-divider bg-surface-card/20 grayscale opacity-60">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-content-secondary">Sem registros para o horizonte selecionado</p>
          </Card>
        ) : (
          <Card variant="glass" className="rounded-2xl overflow-hidden border border-border-divider bg-surface-card/80 backdrop-blur-xl shadow-2xl">
            <Table>
              <TableHeader className="bg-surface-background/50">
                <TableRow className="hover:bg-transparent border-border-divider h-16">
                  <TableHead className="pl-10 text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Agente Especialista</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Fluxo</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Sucesso</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Compliance</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">TMR Médio</TableHead>
                  <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Rating CSAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {agents.map(a => (
                  <TableRow key={a.agent_id} className="hover:bg-plannera-primary/[0.02] border-border-divider group transition-all h-24">
                    <TableCell className="pl-10">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-plannera-primary/5 border border-plannera-primary/10 flex items-center justify-center text-[12px] font-black text-plannera-primary group-hover:scale-110 transition-transform shadow-inner">
                          {a.agent_id.slice(0, 2).toUpperCase()}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-[12px] font-black uppercase tracking-tight text-content-primary group-hover:text-plannera-primary transition-colors">
                            {a.agent_id.split('-')[0] || 'Agente'}
                          </span>
                          <span className="text-[9px] font-black text-content-secondary/30 uppercase tracking-widest">{a.agent_id.slice(0, 8)}</span>
                        </div>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-[14px] text-content-primary tabular-nums">{a.received}</TableCell>
                    <TableCell className="text-right font-black text-[14px] text-emerald-500 tabular-nums">{a.resolved}</TableCell>
                    <TableCell className="text-right"><CompliancePill value={a.res_compliance_pct} /></TableCell>
                    <TableCell className="text-right font-black text-[14px] text-content-secondary opacity-60 group-hover:opacity-100 tabular-nums">{formatMinutes(a.avg_resolution_minutes)}</TableCell>
                    <TableCell className="text-right pr-10">
                      {a.avg_csat != null
                        ? <div className="flex items-center justify-end gap-2">
                            <div className={cn(
                              "px-3 py-1.5 rounded-2xl border font-black text-[12px] flex items-center gap-2 tabular-nums shadow-sm",
                              a.avg_csat >= 4 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : a.avg_csat >= 3 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-destructive/10 border-destructive/20 text-destructive'
                            )}>
                              <Star className={cn("w-3.5 h-3.5 fill-current", a.avg_csat >= 4 ? 'text-emerald-500' : 'text-current opacity-60')} />
                              {a.avg_csat}
                            </div>
                          </div>
                        : <span className="text-content-secondary font-black text-[12px] opacity-10">——</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>

      {/* Camada 4 — Por Cliente */}
      <section className="space-y-8">
        <div className="flex items-center gap-4 mb-8">
          <div className="w-2 h-6 bg-plannera-orange rounded-full shadow-[0_0_15px_rgba(247,148,30,0.4)]" />
          <h2 className="text-[12px] font-black uppercase tracking-[0.3em] text-content-primary">Client Engagement Health</h2>
        </div>

        {loading ? (
          <div className="h-48 w-full animate-pulse bg-surface-card rounded-2xl border border-border-divider" />
        ) : clients.length === 0 ? (
          <Card variant="glass" className="rounded-2xl p-20 text-center border-dashed border-2 border-border-divider bg-surface-card/20 grayscale opacity-60">
            <p className="text-[11px] font-black uppercase tracking-[0.4em] text-content-secondary">Sem dados de engajamento no período</p>
          </Card>
        ) : (
          <Card variant="glass" className="rounded-2xl overflow-hidden border border-border-divider bg-surface-card/80 backdrop-blur-xl shadow-2xl">
            <Table>
              <TableHeader className="bg-surface-background/50">
                <TableRow className="hover:bg-transparent border-border-divider h-16">
                  <TableHead className="pl-10 text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Cliente Corporativo</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Tickets</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Críticos</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Compliance</TableHead>
                  <TableHead className="text-right text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">TMR Médio</TableHead>
                  <TableHead className="text-right pr-10 text-[10px] font-black uppercase tracking-[0.25em] text-content-secondary/60">Rating CSAT</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {clients.sort((a, b) => b.tickets - a.tickets).map(c => (
                  <TableRow
                    key={c.account_id}
                    onClick={() => window.location.href = `/accounts/${c.account_id}`}
                    className="hover:bg-plannera-orange/[0.02] border-border-divider group transition-all cursor-pointer h-24"
                  >
                    <TableCell className="pl-10">
                      <div className="flex items-center gap-5">
                        <div className="w-12 h-12 rounded-2xl bg-plannera-orange/5 border border-plannera-orange/10 flex items-center justify-center text-[12px] font-black text-plannera-orange group-hover:rotate-6 transition-transform shadow-inner">
                          {c.account_name.slice(0, 2).toUpperCase()}
                        </div>
                        <span className="text-[12px] font-black uppercase tracking-tight text-content-primary group-hover:text-plannera-orange transition-colors">
                          {c.account_name}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell className="text-right font-black text-[14px] text-content-primary tabular-nums">{c.tickets}</TableCell>
                    <TableCell className="text-right">
                      {c.critical_tickets > 0
                        ? <div className="flex justify-end">
                            <div className="px-3 py-1 rounded-2xl bg-destructive/10 text-destructive border border-destructive/20 font-black text-[11px] animate-pulse shadow-sm">
                              {c.critical_tickets} ATENÇÃO
                            </div>
                          </div>
                        : <span className="text-content-secondary font-black text-[14px] opacity-10 tabular-nums">0</span>}
                    </TableCell>
                    <TableCell className="text-right"><CompliancePill value={c.res_compliance_pct} /></TableCell>
                    <TableCell className="text-right font-black text-[14px] text-content-secondary opacity-60 group-hover:opacity-100 tabular-nums">{formatMinutes(c.avg_resolution_minutes)}</TableCell>
                    <TableCell className="text-right pr-10">
                      {c.avg_csat != null
                        ? <div className="flex items-center justify-end gap-2">
                            <div className={cn(
                              "px-3 py-1.5 rounded-2xl border font-black text-[12px] flex items-center gap-2 tabular-nums shadow-sm",
                              c.avg_csat >= 4 ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-500' : c.avg_csat >= 3 ? 'bg-amber-500/10 border-amber-500/20 text-amber-500' : 'bg-destructive/10 border-destructive/20 text-destructive'
                            )}>
                              <Star className={cn("w-3.5 h-3.5 fill-current", c.avg_csat >= 4 ? 'text-emerald-500' : 'text-current opacity-60')} />
                              {c.avg_csat}
                            </div>
                          </div>
                        : <span className="text-content-secondary font-black text-[12px] opacity-10">——</span>}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </Card>
        )}
      </section>
    </PageContainer>
  )
}
