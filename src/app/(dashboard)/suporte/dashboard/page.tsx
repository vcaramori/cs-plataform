'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  BarChart, Bar, LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid
} from 'recharts'
import {
  TicketCheck, AlertTriangle, Clock, CheckCircle2, Download,
  Users, Building2, TrendingUp, RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
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
  if (value === null) return <span className="text-slate-500">—</span>
  const color = value >= 90 ? 'text-emerald-400' : value >= 70 ? 'text-amber-400' : 'text-red-400'
  return <span className={cn('font-bold', color)}>{value}%</span>
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
    <div className="p-6 space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-3">
            <TicketCheck className="w-6 h-6 text-indigo-400" />
            Dashboard de Suporte
          </h1>
          <p className="text-slate-400 text-sm mt-1">Visão executiva do módulo de suporte</p>
        </div>
        <div className="flex items-center gap-2">
          {(['7d', '30d', '90d'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors',
                period === p ? 'bg-indigo-500 text-white' : 'bg-white/5 text-slate-400 hover:bg-white/10'
              )}
            >
              {p === '7d' ? '7 dias' : p === '30d' ? '30 dias' : '90 dias'}
            </button>
          ))}
          <Button size="sm" variant="outline" onClick={load} disabled={loading}>
            <RefreshCw className={cn('w-3.5 h-3.5 mr-1', loading && 'animate-spin')} />
            Atualizar
          </Button>
          <Button size="sm" onClick={handleExport}>
            <Download className="w-3.5 h-3.5 mr-1" />
            Exportar XLSX
          </Button>
        </div>
      </div>

      {/* Camada 1 — KPIs Operacionais */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Agora — Operacional</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Abertos', value: operational?.open_now, icon: TicketCheck, color: 'text-indigo-400' },
            { label: 'SLA Vencido', value: operational?.sla_breached, icon: AlertTriangle, color: 'text-red-400' },
            { label: 'SLA Atenção', value: operational?.sla_attention, icon: Clock, color: 'text-amber-400' },
            { label: 'Aguard. Fechamento', value: operational?.awaiting_close, icon: CheckCircle2, color: 'text-emerald-400' },
          ].map(({ label, value, icon: Icon, color }) => (
            <div key={label} className="glass-card rounded-2xl p-4 space-y-2">
              <div className={cn('flex items-center gap-2 text-xs font-semibold uppercase tracking-wider', color)}>
                <Icon className="w-4 h-4" />
                {label}
              </div>
              <p className="text-3xl font-black text-white">
                {loading ? '—' : (value ?? 0)}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Camada 2 — KPIs do período + gráficos */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3">Período</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          {[
            { label: 'Recebidos', value: periodData?.tickets_received },
            { label: 'Resolvidos', value: periodData?.tickets_resolved },
            { label: 'Compliance SLA Resolução', value: periodData?.sla_resolution_compliance_pct != null ? `${periodData.sla_resolution_compliance_pct}%` : '—' },
            { label: 'CSAT Médio', value: periodData?.avg_csat != null ? `${periodData.avg_csat}/5` : '—' },
          ].map(({ label, value }) => (
            <div key={label} className="glass-card rounded-2xl p-4 space-y-1">
              <p className="text-xs text-slate-500 font-semibold">{label}</p>
              <p className="text-2xl font-black text-white">{loading ? '—' : (value ?? 0)}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-400 mb-4">TMP — Tempo Médio 1ª Resposta</p>
            {periodData && (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={[{ name: 'Período', value: periodData.avg_first_response_minutes ?? 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}min`, 'TMP']} contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                  <Bar dataKey="value" fill="#6366f1" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-center text-xs text-slate-500 mt-2">
              {loading ? '—' : formatMinutes(periodData?.avg_first_response_minutes ?? null)}
            </p>
          </div>

          <div className="glass-card rounded-2xl p-4">
            <p className="text-xs font-semibold text-slate-400 mb-4">TMR — Tempo Médio de Resolução</p>
            {periodData && (
              <ResponsiveContainer width="100%" height={120}>
                <BarChart data={[{ name: 'Período', value: periodData.avg_resolution_minutes ?? 0 }]}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#334155" />
                  <XAxis dataKey="name" tick={{ fill: '#64748b', fontSize: 11 }} />
                  <YAxis tick={{ fill: '#64748b', fontSize: 11 }} />
                  <Tooltip formatter={(v: any) => [`${v}min`, 'TMR']} contentStyle={{ background: '#0f172a', border: '1px solid #334155' }} />
                  <Bar dataKey="value" fill="#10b981" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
            <p className="text-center text-xs text-slate-500 mt-2">
              {loading ? '—' : formatMinutes(periodData?.avg_resolution_minutes ?? null)}
            </p>
          </div>
        </div>
      </section>

      {/* Camada 3 — Por Agente */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <Users className="w-4 h-4" /> Desempenho por Agente
        </h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : agents.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-500 text-sm">
            Nenhum dado de agente no período selecionado.
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-3 text-left">Agente</th>
                  <th className="p-3 text-right">Recebidos</th>
                  <th className="p-3 text-right">Resolvidos</th>
                  <th className="p-3 text-right">Compliance SLA</th>
                  <th className="p-3 text-right">TMR</th>
                  <th className="p-3 text-right">CSAT</th>
                </tr>
              </thead>
              <tbody>
                {agents.map(a => (
                  <tr key={a.agent_id} className="border-b border-white/5 hover:bg-white/5 transition-colors">
                    <td className="p-3 text-slate-300 font-mono text-xs">{a.agent_id.slice(0, 8)}…</td>
                    <td className="p-3 text-right text-white font-bold">{a.received}</td>
                    <td className="p-3 text-right text-emerald-400 font-bold">{a.resolved}</td>
                    <td className="p-3 text-right"><CompliancePill value={a.res_compliance_pct} /></td>
                    <td className="p-3 text-right text-slate-300">{formatMinutes(a.avg_resolution_minutes)}</td>
                    <td className="p-3 text-right">
                      {a.avg_csat != null
                        ? <span className={cn('font-bold', a.avg_csat >= 4 ? 'text-emerald-400' : a.avg_csat >= 3 ? 'text-amber-400' : 'text-red-400')}>{a.avg_csat}/5</span>
                        : <span className="text-slate-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {/* Camada 4 — Por Cliente */}
      <section>
        <h2 className="text-xs font-bold uppercase tracking-widest text-slate-500 mb-3 flex items-center gap-2">
          <Building2 className="w-4 h-4" /> Saúde de Suporte por Cliente
        </h2>
        {loading ? (
          <p className="text-slate-500 text-sm">Carregando...</p>
        ) : clients.length === 0 ? (
          <div className="glass-card rounded-2xl p-8 text-center text-slate-500 text-sm">
            Nenhum dado de cliente no período selecionado.
          </div>
        ) : (
          <div className="glass-card rounded-2xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-white/10 text-slate-500 text-xs uppercase tracking-wider">
                  <th className="p-3 text-left">Cliente</th>
                  <th className="p-3 text-right">Tickets</th>
                  <th className="p-3 text-right">Críticos</th>
                  <th className="p-3 text-right">Compliance SLA</th>
                  <th className="p-3 text-right">TMR</th>
                  <th className="p-3 text-right">CSAT</th>
                </tr>
              </thead>
              <tbody>
                {clients.sort((a, b) => b.tickets - a.tickets).map(c => (
                  <tr
                    key={c.account_id}
                    className="border-b border-white/5 hover:bg-white/5 transition-colors cursor-pointer"
                    onClick={() => window.location.href = `/accounts/${c.account_id}`}
                  >
                    <td className="p-3 text-white font-medium">{c.account_name}</td>
                    <td className="p-3 text-right text-white font-bold">{c.tickets}</td>
                    <td className="p-3 text-right">
                      {c.critical_tickets > 0
                        ? <span className="text-red-400 font-bold">{c.critical_tickets}</span>
                        : <span className="text-slate-600">0</span>}
                    </td>
                    <td className="p-3 text-right"><CompliancePill value={c.res_compliance_pct} /></td>
                    <td className="p-3 text-right text-slate-300">{formatMinutes(c.avg_resolution_minutes)}</td>
                    <td className="p-3 text-right">
                      {c.avg_csat != null
                        ? <span className={cn('font-bold', c.avg_csat >= 4 ? 'text-emerald-400' : c.avg_csat >= 3 ? 'text-amber-400' : 'text-red-400')}>{c.avg_csat}/5</span>
                        : <span className="text-slate-500">—</span>}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    </div>
  )
}
