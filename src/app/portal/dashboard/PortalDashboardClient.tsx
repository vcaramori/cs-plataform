'use client'

import { useMemo } from 'react'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { Ticket, CheckCircle2, ShieldCheck, Clock } from 'lucide-react'

interface PortalDashboardClientProps {
  accountName: string
  tickets: any[]
  recentClosed: any[]
}

const STATUS_OPEN = ['open', 'in_progress', 'in-progress', 'reopened', 'waiting', 'escalated']

function StatCard({ icon: Icon, label, value, sub, color }: {
  icon: any; label: string; value: string | number; sub?: string; color: string
}) {
  return (
    <div className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl p-6 flex items-start gap-4 shadow-sm">
      <div className={`w-11 h-11 rounded-xl flex items-center justify-center shrink-0 ${color}`}>
        <Icon className="w-5 h-5" />
      </div>
      <div>
        <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">{label}</p>
        <p className="text-2xl font-black text-foreground mt-0.5">{value}</p>
        {sub && <p className="text-[10px] text-content-secondary mt-0.5">{sub}</p>}
      </div>
    </div>
  )
}

export function PortalDashboardClient({ accountName, tickets, recentClosed }: PortalDashboardClientProps) {
  const stats = useMemo(() => {
    const open = tickets.filter(t => STATUS_OPEN.includes(t.status)).length
    const resolved30d = recentClosed.length

    const closedAll = tickets.filter(t => ['resolved', 'closed'].includes(t.status))
    const slaCompliant = closedAll.length > 0
      ? closedAll.filter(t => !t.sla_breach_resolution).length
      : null
    const slaRate = slaCompliant !== null && closedAll.length > 0
      ? Math.round((slaCompliant / closedAll.length) * 100)
      : null

    const withResolution = closedAll.filter(t => t.opened_at && t.resolved_at)
    const avgHours = withResolution.length > 0
      ? Math.round(
          withResolution.reduce((acc, t) => {
            const diff = new Date(t.resolved_at).getTime() - new Date(t.opened_at).getTime()
            return acc + diff / (1000 * 60 * 60)
          }, 0) / withResolution.length
        )
      : null

    return { open, resolved30d, slaRate, avgHours }
  }, [tickets, recentClosed])

  // Agrupa por semana (últimas 8 semanas)
  const weeklyData = useMemo(() => {
    const weeks: Record<string, number> = {}
    const now = Date.now()
    for (let i = 7; i >= 0; i--) {
      const d = new Date(now - i * 7 * 24 * 60 * 60 * 1000)
      const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
      weeks[key] = 0
    }
    tickets.forEach(t => {
      const d = new Date(t.opened_at)
      const diff = Math.floor((Date.now() - d.getTime()) / (7 * 24 * 60 * 60 * 1000))
      if (diff >= 0 && diff <= 7) {
        const key = `${d.getDate().toString().padStart(2, '0')}/${(d.getMonth() + 1).toString().padStart(2, '0')}`
        if (key in weeks) weeks[key]++
      }
    })
    return Object.entries(weeks).map(([week, count]) => ({ week, count }))
  }, [tickets])

  const formatHours = (h: number | null) => {
    if (h === null) return '—'
    if (h < 24) return `${h}h`
    return `${Math.round(h / 24)}d`
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Visão Geral</h1>
        <p className="text-sm text-content-secondary mt-1">{accountName}</p>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <StatCard
          icon={Ticket}
          label="Chamados Abertos"
          value={stats.open}
          sub="em andamento agora"
          color="bg-amber-500/10 text-amber-500"
        />
        <StatCard
          icon={CheckCircle2}
          label="Resolvidos (30d)"
          value={stats.resolved30d}
          sub="últimos 30 dias"
          color="bg-emerald-500/10 text-emerald-500"
        />
        <StatCard
          icon={ShieldCheck}
          label="SLA Cumprido"
          value={stats.slaRate !== null ? `${stats.slaRate}%` : '—'}
          sub="dos chamados fechados"
          color={stats.slaRate !== null && stats.slaRate >= 80 ? 'bg-plannera-ds/10 text-plannera-ds' : 'bg-red-500/10 text-red-500'}
        />
        <StatCard
          icon={Clock}
          label="Tempo Médio"
          value={formatHours(stats.avgHours)}
          sub="para resolução"
          color="bg-plannera-orange/10 text-plannera-orange"
        />
      </div>

      {/* Gráfico */}
      <div className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl p-6 shadow-sm">
        <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-6">
          Chamados Abertos — Últimas 8 Semanas
        </p>
        <ResponsiveContainer width="100%" height={180}>
          <BarChart data={weeklyData} barSize={24}>
            <XAxis dataKey="week" tick={{ fontSize: 10, fontWeight: 700 }} axisLine={false} tickLine={false} />
            <YAxis allowDecimals={false} tick={{ fontSize: 10 }} axisLine={false} tickLine={false} width={24} />
            <Tooltip
              cursor={{ fill: 'rgba(247,148,30,0.06)' }}
              contentStyle={{ borderRadius: 12, fontSize: 12, fontWeight: 700, border: '1px solid var(--border)' }}
              formatter={(v: any) => [`${v} chamado(s)`, '']}
            />
            <Bar dataKey="count" radius={[6, 6, 0, 0]}>
              {weeklyData.map((_, i) => (
                <Cell key={i} fill={i === weeklyData.length - 1 ? '#f7941e' : '#f7941e40'} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  )
}
