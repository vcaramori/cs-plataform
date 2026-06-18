'use client'

import { useState, useEffect, useCallback } from 'react'
import { useDateRange } from '@/hooks/useDateRange'
import { DateRangePicker } from '@/components/ui/DateRangePicker'
import {
  AreaChart, Area, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid,
} from 'recharts'
import {
  TicketCheck, AlertTriangle, Clock, CheckCircle2, Download, Inbox,
  Users, Building2, RefreshCw, ShieldCheck, Star, Mail, MessageSquare, TrendingUp,
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import {
  Table, TableBody, TableCell, TableHead, TableHeader, TableRow,
} from '@/components/ui/table'
import { cn } from '@/lib/utils'

// ─── Tipos ──────────────────────────────────────────────────────────────────

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
  avg_first_response_business_minutes: number | null
  avg_resolution_business_minutes: number | null
  avg_response_minutes: number | null
  avg_response_business_minutes: number | null
  avg_interactions_resolved: number | null
  fcr_pct: number | null
  fcr_count: number
  closed_count: number
  avg_csat: number | null
}
interface AgentRow {
  agent_id: string
  received: number
  resolved: number
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
interface TrendPoint { date: string; received: number; resolved: number }

// ─── Helpers ──────────────────────────────────────────────────────────────────

function fmtMin(mins: number | null | undefined): string {
  if (mins == null) return '—'
  if (mins < 60) return `${mins}m`
  const h = Math.floor(mins / 60), m = mins % 60
  if (h < 24) return m ? `${h}h ${m}m` : `${h}h`
  const d = Math.floor(h / 24), rh = h % 24
  return rh ? `${d}d ${rh}h` : `${d}d`
}
const fmtDay = (iso: string) => { const [, m, d] = iso.split('-'); return `${d}/${m}` }
const complianceTone = (pct: number | null | undefined) =>
  pct == null ? 'text-content-secondary' : pct >= 90 ? 'text-emerald-500' : pct >= 70 ? 'text-amber-500' : 'text-red-500'
const csatTone = (v: number | null | undefined) =>
  v == null ? 'text-content-secondary' : v >= 4 ? 'text-emerald-500' : v >= 3 ? 'text-amber-500' : 'text-red-500'

type Tone = 'indigo' | 'emerald' | 'amber' | 'red' | 'blue' | 'orange' | 'slate'
const toneMap: Record<Tone, { text: string; bg: string; bar: string }> = {
  indigo: { text: 'text-indigo-500', bg: 'bg-indigo-500/10', bar: 'bg-indigo-500' },
  emerald: { text: 'text-emerald-500', bg: 'bg-emerald-500/10', bar: 'bg-emerald-500' },
  amber: { text: 'text-amber-500', bg: 'bg-amber-500/10', bar: 'bg-amber-500' },
  red: { text: 'text-red-500', bg: 'bg-red-500/10', bar: 'bg-red-500' },
  blue: { text: 'text-blue-500', bg: 'bg-blue-500/10', bar: 'bg-blue-500' },
  orange: { text: 'text-plannera-orange', bg: 'bg-plannera-orange/10', bar: 'bg-plannera-orange' },
  slate: { text: 'text-content-primary', bg: 'bg-content-secondary/10', bar: 'bg-content-secondary' },
}

function SectionTitle({ children, accent = 'bg-plannera-primary' }: { children: React.ReactNode; accent?: string }) {
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn('w-1.5 h-5 rounded-full', accent)} />
      <h2 className="text-[11px] font-black uppercase tracking-[0.25em] text-content-secondary">{children}</h2>
    </div>
  )
}

const CARD = 'rounded-2xl border border-border-divider bg-surface-card p-5 flex flex-col h-full'

function HeroTile({ label, value, sub, tone, icon: Icon, valueClass }: {
  label: string; value: React.ReactNode; sub?: React.ReactNode; tone: Tone; icon: React.ElementType; valueClass?: string
}) {
  const t = toneMap[tone]
  return (
    <div className={CARD}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary/70">{label}</p>
        <div className={cn('p-2 rounded-xl', t.bg, t.text)}><Icon className="w-4 h-4" /></div>
      </div>
      <p className={cn('text-3xl font-black tracking-tighter tabular-nums leading-none', valueClass ?? t.text)}>{value}</p>
      {sub && <p className="mt-2 text-[11px] font-medium text-content-secondary">{sub}</p>}
    </div>
  )
}

function StatTile({ label, value, tone, icon: Icon, status }: {
  label: string; value: React.ReactNode; tone: Tone; icon: React.ElementType; status?: string
}) {
  const t = toneMap[tone]
  return (
    <div className="rounded-2xl border border-border-divider bg-surface-card p-4 flex items-center gap-4">
      <div className={cn('p-2.5 rounded-xl shrink-0', t.bg, t.text)}><Icon className="w-5 h-5" /></div>
      <div className="min-w-0">
        <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary/70 truncate">{label}</p>
        <p className={cn('text-2xl font-black tracking-tighter tabular-nums leading-tight', t.text)}>{value}</p>
        {status && <p className="text-[9px] font-bold uppercase tracking-widest text-content-secondary/50 truncate">{status}</p>}
      </div>
    </div>
  )
}

function TimeTile({ label, corrido, util, compliancePct, tone, icon: Icon, hint }: {
  label: string; corrido: number | null; util: number | null; compliancePct?: number | null; tone: Tone; icon: React.ElementType; hint?: string
}) {
  const t = toneMap[tone]
  return (
    <div className={CARD}>
      <div className="flex items-start justify-between mb-3">
        <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary/70">{label}</p>
        <div className={cn('p-2 rounded-xl', t.bg, t.text)}><Icon className="w-4 h-4" /></div>
      </div>
      <div className="flex items-baseline gap-2">
        <p className={cn('text-3xl font-black tracking-tighter tabular-nums leading-none', t.text)}>{fmtMin(corrido)}</p>
        <span className="text-[9px] font-black uppercase tracking-widest text-content-secondary/40">corrido</span>
      </div>
      <p className="mt-2 text-[11px] font-bold uppercase tracking-widest text-content-secondary/60">
        Útil (SLA): <span className={t.text}>{fmtMin(util)}</span>
      </p>
      {compliancePct != null ? (
        <div className="mt-auto pt-4">
          <div className="flex items-center justify-between mb-1">
            <span className="text-[9px] font-black uppercase tracking-widest text-content-secondary/50">Compliance SLA</span>
            <span className={cn('text-[11px] font-black tabular-nums', complianceTone(compliancePct))}>{compliancePct}%</span>
          </div>
          <div className="h-1.5 rounded-full bg-content-secondary/10 overflow-hidden">
            <div className={cn('h-full rounded-full', compliancePct >= 90 ? 'bg-emerald-500' : compliancePct >= 70 ? 'bg-amber-500' : 'bg-red-500')} style={{ width: `${Math.min(100, compliancePct)}%` }} />
          </div>
        </div>
      ) : hint ? (
        <p className="mt-auto pt-4 text-[9px] font-bold uppercase tracking-widest text-content-secondary/40">{hint}</p>
      ) : null}
    </div>
  )
}

function CsatPill({ value }: { value: number | null }) {
  if (value == null) return <span className="text-content-secondary/30 font-black text-xs">——</span>
  return (
    <span className={cn('inline-flex items-center gap-1 font-black text-xs tabular-nums', csatTone(value))}>
      <Star className="w-3.5 h-3.5 fill-current" />{value}
    </span>
  )
}

// ─── Componente ───────────────────────────────────────────────────────────────

export function SupportDashboardClient() {
  const { dateFrom, dateTo } = useDateRange('30d')
  const [operational, setOperational] = useState<OperationalData | null>(null)
  const [period, setPeriod] = useState<PeriodData | null>(null)
  const [agents, setAgents] = useState<AgentRow[]>([])
  const [clients, setClients] = useState<ClientRow[]>([])
  const [trend, setTrend] = useState<TrendPoint[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    const qs = `date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`
    const [op, pd, ag, cl, tr] = await Promise.all([
      fetch('/api/support-dashboard/operational').then(r => r.json()),
      fetch(`/api/support-dashboard/period?${qs}`).then(r => r.json()),
      fetch(`/api/support-dashboard/by-agent?${qs}`).then(r => r.json()),
      fetch(`/api/support-dashboard/by-client?${qs}`).then(r => r.json()),
      fetch(`/api/support-dashboard/trend?${qs}`).then(r => r.json()),
    ])
    setOperational(op); setPeriod(pd)
    setAgents(ag.agents ?? []); setClients(cl.clients ?? []); setTrend(tr.series ?? [])
    setLoading(false)
  }, [dateFrom, dateTo])

  useEffect(() => { load() }, [load])

  const handleExport = () => window.open(`/api/support-reports/export?date_from=${encodeURIComponent(dateFrom)}&date_to=${encodeURIComponent(dateTo)}`)

  const backlog = operational?.open_now ?? 0
  const resolutionRate = period && period.tickets_received > 0 ? Math.round((period.tickets_resolved / period.tickets_received) * 100) : null

  return (
    <PageContainer>
      <ModuleHeader title="Painel de Suporte" subtitle="Indicadores da área — atendimento, SLA e satisfação" iconName="TicketCheck" />

      <div className="flex flex-wrap items-center gap-3 bg-surface-card border border-border-divider p-3 rounded-2xl mb-8">
        <DateRangePicker />
        <div className="flex-1" />
        <Button size="sm" onClick={handleExport} className="h-9 bg-success hover:bg-emerald-600 text-white rounded-xl px-4 gap-2 text-[10px] font-black uppercase tracking-widest border-none">
          <Download className="w-4 h-4" /> Relatório XLSX
        </Button>
      </div>

      {/* Hero — indicadores-chave do período */}
      <section className="mb-8">
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <HeroTile label="CSAT Médio" tone="amber" icon={Star}
            value={period?.avg_csat != null ? `${period.avg_csat}/5` : '—'} valueClass={csatTone(period?.avg_csat)}
            sub="Satisfação do cliente no período" />
          <HeroTile label="Compliance SLA" tone="emerald" icon={ShieldCheck}
            value={period?.sla_resolution_compliance_pct != null ? `${period.sla_resolution_compliance_pct}%` : '—'}
            valueClass={complianceTone(period?.sla_resolution_compliance_pct)}
            sub={`Resolução · 1ª resposta: ${period?.sla_first_response_compliance_pct != null ? period.sla_first_response_compliance_pct + '%' : '—'}`} />
          <HeroTile label="TMR (útil)" tone="indigo" icon={CheckCircle2}
            value={fmtMin(period?.avg_resolution_business_minutes)}
            sub={`Corrido: ${fmtMin(period?.avg_resolution_minutes)}`} />
          <HeroTile label="Resolvido na 1ª Resposta" tone="blue" icon={TicketCheck}
            value={period?.fcr_pct != null ? `${period.fcr_pct}%` : '—'}
            sub={`${period?.fcr_count ?? 0} de ${period?.closed_count ?? 0} encerrados`} />
        </div>
      </section>

      {/* Pulso operacional — agora */}
      <section className="mb-8">
        <SectionTitle accent="bg-blue-500">Operação agora</SectionTitle>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <StatTile label="Chamados Abertos" tone="blue" icon={TicketCheck} value={operational?.open_now ?? 0} status="Em fila / andamento" />
          <StatTile label="SLA Vencido" tone="red" icon={AlertTriangle} value={operational?.sla_breached ?? 0} status="Ação imediata" />
          <StatTile label="SLA em Atenção" tone="amber" icon={Clock} value={operational?.sla_attention ?? 0} status="Janela de risco" />
          <StatTile label="Aguardando Fechamento" tone="emerald" icon={CheckCircle2} value={operational?.awaiting_close ?? 0} status="Validação pendente" />
        </div>
      </section>

      {/* Velocidade & SLA */}
      <section className="mb-8">
        <SectionTitle accent="bg-indigo-500">Velocidade & SLA</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          <TimeTile label="TMP — 1ª Resposta" tone="indigo" icon={Clock}
            corrido={period?.avg_first_response_minutes ?? null} util={period?.avg_first_response_business_minutes ?? null}
            compliancePct={period?.sla_first_response_compliance_pct ?? null} />
          <TimeTile label="TMR — Resolução" tone="emerald" icon={CheckCircle2}
            corrido={period?.avg_resolution_minutes ?? null} util={period?.avg_resolution_business_minutes ?? null}
            compliancePct={period?.sla_resolution_compliance_pct ?? null} />
          <TimeTile label="Tempo Médio de Resposta" tone="blue" icon={Mail}
            corrido={period?.avg_response_minutes ?? null} util={period?.avg_response_business_minutes ?? null}
            hint="Solicitante → resposta do agente" />
        </div>
      </section>

      {/* Volume & tendência */}
      <section className="mb-8">
        <SectionTitle accent="bg-plannera-orange">Volume & Tendência</SectionTitle>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
          {/* Stats à esquerda */}
          <div className="grid grid-cols-2 gap-4 content-start">
            <StatTile label="Recebidos" tone="slate" icon={Inbox} value={period?.tickets_received ?? 0} status={resolutionRate != null ? `${resolutionRate}% resolvidos` : undefined} />
            <StatTile label="Resolvidos" tone="emerald" icon={CheckCircle2} value={period?.tickets_resolved ?? 0} />
            <StatTile label="Em aberto (backlog)" tone="blue" icon={TicketCheck} value={backlog} />
            <StatTile label="Reabertos" tone="amber" icon={RefreshCw} value={period?.reopened ?? 0} />
            <StatTile label="Interações p/ resolução" tone="orange" icon={MessageSquare} value={period?.avg_interactions_resolved ?? '—'} status="Mensagens (média)" />
          </div>
          {/* Gráfico à direita (2 colunas) */}
          <div className={cn(CARD, 'lg:col-span-2')}>
            <div className="flex items-center justify-between mb-4">
              <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary/70">Recebidos x Resolvidos por dia</p>
              <TrendingUp className="w-4 h-4 text-plannera-orange" />
            </div>
            {loading ? (
              <div className="h-[220px] w-full animate-pulse bg-surface-background rounded-xl" />
            ) : trend.length === 0 ? (
              <div className="h-[220px] flex items-center justify-center text-[11px] font-black uppercase tracking-widest text-content-secondary/40">Sem dados no período</div>
            ) : (
              <div className="h-[220px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={trend} margin={{ top: 4, right: 8, left: -16, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gRec" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#6366f1" stopOpacity={0.5} /><stop offset="95%" stopColor="#6366f1" stopOpacity={0.05} /></linearGradient>
                      <linearGradient id="gRes" x1="0" y1="0" x2="0" y2="1"><stop offset="5%" stopColor="#10b981" stopOpacity={0.5} /><stop offset="95%" stopColor="#10b981" stopOpacity={0.05} /></linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="var(--border-divider)" vertical={false} />
                    <XAxis dataKey="date" tickFormatter={fmtDay} tick={{ fontSize: 10, fill: 'var(--content-secondary)' }} axisLine={false} tickLine={false} minTickGap={24} />
                    <YAxis tick={{ fontSize: 10, fill: 'var(--content-secondary)' }} axisLine={false} tickLine={false} allowDecimals={false} width={28} />
                    <Tooltip
                      labelFormatter={(l) => fmtDay(String(l))}
                      contentStyle={{ background: 'var(--surface-card)', border: '1px solid var(--border-divider)', borderRadius: 12, fontSize: 11, fontWeight: 700 }}
                      formatter={(v: any, n: any) => [v, n === 'received' ? 'Recebidos' : 'Resolvidos']}
                    />
                    <Area type="monotone" dataKey="received" stroke="#6366f1" strokeWidth={2} fill="url(#gRec)" />
                    <Area type="monotone" dataKey="resolved" stroke="#10b981" strokeWidth={2} fill="url(#gRes)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Distribuição — clientes & agentes */}
      <section>
        <SectionTitle accent="bg-plannera-orange">Distribuição</SectionTitle>
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-4">
          {/* Clientes */}
          <div className="rounded-2xl border border-border-divider bg-surface-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border-divider">
              <Building2 className="w-4 h-4 text-plannera-orange" />
              <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Top Clientes por Volume</p>
            </div>
            {loading ? <div className="h-40 animate-pulse bg-surface-background m-3 rounded-xl" /> : clients.length === 0 ? (
              <div className="p-10 text-center text-[11px] font-black uppercase tracking-widest text-content-secondary/40">Sem dados no período</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border-divider h-10">
                    <TableHead className="pl-5 text-[9px] font-black uppercase tracking-widest text-content-secondary/50">Cliente</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-content-secondary/50">Tickets</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-content-secondary/50">Críticos</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-content-secondary/50">SLA</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-content-secondary/50">TMR</TableHead>
                    <TableHead className="text-right pr-5 text-[9px] font-black uppercase tracking-widest text-content-secondary/50">CSAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...clients].sort((a, b) => b.tickets - a.tickets).slice(0, 8).map(c => (
                    <TableRow key={c.account_id} onClick={() => (window.location.href = `/accounts/${c.account_id}`)}
                      className="hover:bg-plannera-orange/[0.03] border-border-divider cursor-pointer h-12">
                      <TableCell className="pl-5 max-w-[180px]"><span className="text-xs font-bold text-content-primary truncate block">{c.account_name}</span></TableCell>
                      <TableCell className="text-right text-xs font-black tabular-nums text-content-primary">{c.tickets}</TableCell>
                      <TableCell className="text-right">{c.critical_tickets > 0 ? <span className="text-[11px] font-black text-red-500 tabular-nums">{c.critical_tickets}</span> : <span className="text-content-secondary/30 text-xs">0</span>}</TableCell>
                      <TableCell className={cn('text-right text-[11px] font-black tabular-nums', complianceTone(c.res_compliance_pct))}>{c.res_compliance_pct != null ? `${c.res_compliance_pct}%` : '—'}</TableCell>
                      <TableCell className="text-right text-[11px] font-bold tabular-nums text-content-secondary">{fmtMin(c.avg_resolution_minutes)}</TableCell>
                      <TableCell className="text-right pr-5"><CsatPill value={c.avg_csat} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>

          {/* Agentes */}
          <div className="rounded-2xl border border-border-divider bg-surface-card overflow-hidden">
            <div className="flex items-center gap-2 px-5 py-3 border-b border-border-divider">
              <Users className="w-4 h-4 text-plannera-primary" />
              <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">Desempenho por Agente</p>
            </div>
            {loading ? <div className="h-40 animate-pulse bg-surface-background m-3 rounded-xl" /> : agents.length === 0 ? (
              <div className="p-10 text-center text-[11px] font-black uppercase tracking-widest text-content-secondary/40">Sem agentes atribuídos no período</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow className="hover:bg-transparent border-border-divider h-10">
                    <TableHead className="pl-5 text-[9px] font-black uppercase tracking-widest text-content-secondary/50">Agente</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-content-secondary/50">Receb.</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-content-secondary/50">Resolv.</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-content-secondary/50">SLA</TableHead>
                    <TableHead className="text-right text-[9px] font-black uppercase tracking-widest text-content-secondary/50">TMR</TableHead>
                    <TableHead className="text-right pr-5 text-[9px] font-black uppercase tracking-widest text-content-secondary/50">CSAT</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {[...agents].sort((a, b) => b.resolved - a.resolved).slice(0, 8).map(a => (
                    <TableRow key={a.agent_id} className="hover:bg-plannera-primary/[0.03] border-border-divider h-12">
                      <TableCell className="pl-5 max-w-[180px]"><span className="text-xs font-bold text-content-primary truncate block">{a.agent_id.split('-')[0] || 'Agente'}</span></TableCell>
                      <TableCell className="text-right text-xs font-black tabular-nums text-content-primary">{a.received}</TableCell>
                      <TableCell className="text-right text-xs font-black tabular-nums text-emerald-500">{a.resolved}</TableCell>
                      <TableCell className={cn('text-right text-[11px] font-black tabular-nums', complianceTone(a.res_compliance_pct))}>{a.res_compliance_pct != null ? `${a.res_compliance_pct}%` : '—'}</TableCell>
                      <TableCell className="text-right text-[11px] font-bold tabular-nums text-content-secondary">{fmtMin(a.avg_resolution_minutes)}</TableCell>
                      <TableCell className="text-right pr-5"><CsatPill value={a.avg_csat} /></TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </div>
        </div>
      </section>
    </PageContainer>
  )
}
