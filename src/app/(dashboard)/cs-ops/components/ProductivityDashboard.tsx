'use client'

import { useState, useEffect, useCallback } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Loader2, Clock, CheckCircle2, TicketCheck, TrendingUp, ChevronDown,
  Users, Gauge, HeartPulse, AlertTriangle, Target,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

type Period = 'week' | 'month' | 'quarter'

interface Person {
  csmId: string
  csmName: string
  avatarUrl: string | null
  load: { accountsManaged: number; totalMrr: number; totalArr: number; utilizationPct: number; workloadStatus: string }
  effort: { hoursTotal: number; hoursWeeklyAvg: number; billablePct: number; coveragePct: number; touchpoints: number; touchpointsPerAccount: number }
  throughput: { tasksCompleted: number; onTimePct: number | null; avgCycleTimeDays: number | null; overdueBacklog: number }
  support: { ticketsResolved: number; avgFirstResponseHours: number | null; avgResolutionDays: number | null; slaCompliancePct: number | null; avgCsat: number | null; csatCount: number }
  outcomes: { renewalsClosed: number; churnedAccounts: number; expansionDeals: number; expansionValue: number; avgHealth: number; healthImprovements: number; healthRegressions: number; avgNps: number | null; npsCount: number }
  productivityScore: number
  burnout: { score: number; flagged: boolean; indicators: string[] }
}

interface TeamData {
  period: Period
  periodStart: string
  periodEnd: string
  teamSize: number
  totals: { hoursTotal: number; tasksCompleted: number; ticketsResolved: number; expansionValue: number; renewalsClosed: number; churnedAccounts: number }
  averages: { billablePct: number; onTimePct: number | null; slaCompliancePct: number | null; avgCsat: number | null; avgHealth: number; productivityScore: number; utilizationPct: number }
  people: Person[]
}

const PERIOD_LABELS: Record<Period, string> = { week: 'Semana', month: 'Mês', quarter: 'Trimestre' }

const WORKLOAD_STYLES: Record<string, string> = {
  underutilized: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  balanced: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  at_capacity: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  overloaded: 'bg-red-500/10 text-red-600 border-red-500/20',
}

function fmtNum(v: number | null, suffix = '', dash = '—'): string {
  if (v == null) return dash
  return `${v}${suffix}`
}
function scoreColor(v: number): string {
  if (v >= 75) return 'text-emerald-600'
  if (v >= 50) return 'text-amber-600'
  return 'text-red-600'
}

export function ProductivityDashboard() {
  const [period, setPeriod] = useState<Period>('month')
  const [data, setData] = useState<TeamData | null>(null)
  const [soloPerson, setSoloPerson] = useState<Person | null>(null)
  const [loading, setLoading] = useState(true)
  const [expanded, setExpanded] = useState<string | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/cs-ops/productivity?period=${period}`)
      if (!res.ok) throw new Error('fail')
      const json = await res.json()
      if (json.people) { setData(json as TeamData); setSoloPerson(null) }
      else { setSoloPerson(json.person as Person); setData(null) }
    } catch {
      toast.error('Erro ao carregar produtividade da equipe')
    } finally {
      setLoading(false)
    }
  }, [period])

  useEffect(() => { load() }, [load])

  return (
    <div className="space-y-6">
      {/* Período */}
      <div className="flex items-center justify-between gap-4">
        <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
          {data ? `${data.teamSize} pessoas` : 'Meu desempenho'}
          {data && <span className="opacity-50"> · {data.periodStart} → {data.periodEnd}</span>}
        </p>
        <div className="flex items-center gap-1 p-1 bg-surface-card border border-border-divider rounded-2xl">
          {(['week', 'month', 'quarter'] as Period[]).map(p => (
            <button
              key={p}
              onClick={() => setPeriod(p)}
              className={cn(
                'px-4 h-8 rounded-xl text-[10px] font-black uppercase tracking-widest transition-all',
                period === p ? 'bg-plannera-orange text-white shadow' : 'text-content-secondary/60 hover:text-content-primary'
              )}
            >
              {PERIOD_LABELS[p]}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
        </div>
      ) : soloPerson ? (
        <PersonDetail person={soloPerson} solo />
      ) : data ? (
        <>
          {/* KPIs agregados do time */}
          <div className="grid grid-cols-2 md:grid-cols-4 xl:grid-cols-7 gap-3">
            <KpiCard icon={Target} label="Produtividade" value={`${data.averages.productivityScore}`} accent={scoreColor(data.averages.productivityScore)} />
            <KpiCard icon={Gauge} label="Utilização" value={`${data.averages.utilizationPct}%`} />
            <KpiCard icon={Clock} label="Horas (total)" value={`${data.totals.hoursTotal}h`} />
            <KpiCard icon={CheckCircle2} label="Tarefas concl." value={`${data.totals.tasksCompleted}`} />
            <KpiCard icon={TicketCheck} label="Tickets resolv." value={`${data.totals.ticketsResolved}`} />
            <KpiCard icon={HeartPulse} label="Health médio" value={`${data.averages.avgHealth}`} />
            <KpiCard icon={TrendingUp} label="Expansão" value={`R$ ${(data.totals.expansionValue / 1000).toFixed(0)}k`} />
          </div>

          {/* Ranking por pessoa */}
          <div className="space-y-2">
            <div className="hidden md:grid grid-cols-[2.2fr_1fr_1fr_1fr_1fr_0.5fr] gap-3 px-4 text-[8px] font-black uppercase tracking-widest text-content-secondary/50">
              <span>Pessoa</span>
              <span className="text-right">Esforço</span>
              <span className="text-right">Throughput</span>
              <span className="text-right">Suporte/SLA</span>
              <span className="text-right">Outcomes</span>
              <span className="text-right">Score</span>
            </div>
            <AnimatePresence>
              {data.people.map((p, idx) => (
                <motion.div key={p.csmId} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: idx * 0.03 }}>
                  <Card className="border border-border-divider rounded-2xl bg-surface-card overflow-hidden">
                    <button
                      onClick={() => setExpanded(expanded === p.csmId ? null : p.csmId)}
                      className="w-full grid grid-cols-2 md:grid-cols-[2.2fr_1fr_1fr_1fr_1fr_0.5fr] gap-3 items-center p-4 text-left hover:bg-muted/30 transition-colors"
                    >
                      {/* Pessoa */}
                      <div className="flex items-center gap-3 min-w-0">
                        {p.avatarUrl ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img src={p.avatarUrl} alt={p.csmName} className="w-9 h-9 rounded-xl object-cover border border-border-divider shrink-0" />
                        ) : (
                          <div className="w-9 h-9 rounded-xl bg-plannera-primary/5 border border-plannera-primary/10 flex items-center justify-center text-[10px] font-black text-plannera-primary shrink-0">
                            {p.csmName.slice(0, 2).toUpperCase()}
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-[11px] font-black uppercase tracking-tight text-content-primary truncate">{p.csmName}</p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <Badge className={cn('text-[7px] font-black uppercase border', WORKLOAD_STYLES[p.load.workloadStatus])}>
                              {p.load.utilizationPct}%
                            </Badge>
                            <span className="text-[8px] text-content-secondary/50 font-bold">{p.load.accountsManaged} contas</span>
                            {p.burnout.flagged && (
                              <span title="Risco de burnout"><AlertTriangle className="w-3 h-3 text-red-500" /></span>
                            )}
                          </div>
                        </div>
                      </div>
                      {/* Resumos por pilar */}
                      <PillarSummary main={`${p.effort.hoursTotal}h`} sub={`${p.effort.billablePct}% billable`} />
                      <PillarSummary main={`${p.throughput.tasksCompleted}`} sub={p.throughput.onTimePct != null ? `${p.throughput.onTimePct}% no prazo` : 'sem prazo'} />
                      <PillarSummary main={`${p.support.ticketsResolved}`} sub={p.support.slaCompliancePct != null ? `${p.support.slaCompliancePct}% SLA` : '—'} />
                      <PillarSummary main={`${p.outcomes.avgHealth}`} sub={`${p.outcomes.expansionDeals} exp · ${p.outcomes.renewalsClosed} renov`} />
                      {/* Score */}
                      <div className="flex items-center justify-end gap-1.5">
                        <span className={cn('text-lg font-black tabular-nums', scoreColor(p.productivityScore))}>{p.productivityScore}</span>
                        <ChevronDown className={cn('w-4 h-4 text-content-secondary/40 transition-transform', expanded === p.csmId && 'rotate-180')} />
                      </div>
                    </button>

                    <AnimatePresence>
                      {expanded === p.csmId && (
                        <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} exit={{ height: 0, opacity: 0 }} className="overflow-hidden border-t border-border-divider">
                          <PersonDetail person={p} teamAvg={data.averages} />
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          </div>
        </>
      ) : null}
    </div>
  )
}

function KpiCard({ icon: Icon, label, value, accent }: { icon: any; label: string; value: string; accent?: string }) {
  return (
    <Card className="p-3 bg-surface-card border border-border-divider rounded-2xl">
      <div className="flex items-center justify-between mb-1">
        <p className="text-[8px] font-black uppercase tracking-widest text-content-secondary">{label}</p>
        <Icon className={cn('w-3.5 h-3.5 opacity-50', accent ?? 'text-plannera-primary')} />
      </div>
      <p className={cn('text-xl font-black tracking-tight', accent ?? 'text-content-primary')}>{value}</p>
    </Card>
  )
}

function PillarSummary({ main, sub }: { main: string; sub: string }) {
  return (
    <div className="text-right hidden md:block">
      <p className="text-[13px] font-black text-content-primary tabular-nums leading-tight">{main}</p>
      <p className="text-[8px] font-bold uppercase tracking-wider text-content-secondary/50">{sub}</p>
    </div>
  )
}

function PersonDetail({ person: p, teamAvg, solo }: { person: Person; teamAvg?: TeamData['averages']; solo?: boolean }) {
  return (
    <div className={cn('grid grid-cols-1 lg:grid-cols-4 gap-4 p-5 bg-surface-background/40', solo && 'rounded-2xl border border-border-divider')}>
      <DetailBlock title="Esforço & Engajamento" rows={[
        ['Horas totais', `${p.effort.hoursTotal}h`],
        ['Média semanal', `${p.effort.hoursWeeklyAvg}h`],
        ['Billable', `${p.effort.billablePct}%`],
        ['Cobertura carteira', `${p.effort.coveragePct}%`],
        ['Touchpoints', `${p.effort.touchpoints} (${p.effort.touchpointsPerAccount}/conta)`],
      ]} />
      <DetailBlock title="Atividades & Throughput" rows={[
        ['Tarefas concluídas', `${p.throughput.tasksCompleted}`],
        ['No prazo', fmtNum(p.throughput.onTimePct, '%')],
        ['Cycle time', p.throughput.avgCycleTimeDays != null ? `${p.throughput.avgCycleTimeDays}d` : '—'],
        ['Backlog atrasado', `${p.throughput.overdueBacklog}`],
      ]} />
      <DetailBlock title="Suporte & SLA" rows={[
        ['Tickets resolvidos', `${p.support.ticketsResolved}`],
        ['1ª resposta', p.support.avgFirstResponseHours != null ? `${p.support.avgFirstResponseHours}h` : '—'],
        ['Resolução', p.support.avgResolutionDays != null ? `${p.support.avgResolutionDays}d` : '—'],
        ['Dentro do SLA', fmtNum(p.support.slaCompliancePct, '%')],
        ['CSAT', p.support.avgCsat != null ? `${p.support.avgCsat}/5 (${p.support.csatCount})` : '—'],
      ]} />
      <DetailBlock title="Resultados & Outcomes" rows={[
        ['Health médio', `${p.outcomes.avgHealth}`],
        ['Health ↑ / ↓', `${p.outcomes.healthImprovements} / ${p.outcomes.healthRegressions}`],
        ['Renovações', `${p.outcomes.renewalsClosed}`],
        ['Churn', `${p.outcomes.churnedAccounts}`],
        ['Expansão', `${p.outcomes.expansionDeals} · R$ ${(p.outcomes.expansionValue / 1000).toFixed(0)}k`],
        ['NPS', p.outcomes.avgNps != null ? `${p.outcomes.avgNps} (${p.outcomes.npsCount})` : '—'],
      ]} />

      {teamAvg && (
        <div className="lg:col-span-4 flex flex-wrap items-center gap-x-6 gap-y-1 pt-3 border-t border-border-divider text-[9px] font-bold uppercase tracking-wider text-content-secondary/60">
          <span className="flex items-center gap-1"><Users className="w-3 h-3" /> vs média do time:</span>
          <span>Score {p.productivityScore} <span className="opacity-50">/ {teamAvg.productivityScore}</span></span>
          <span>Billable {p.effort.billablePct}% <span className="opacity-50">/ {teamAvg.billablePct}%</span></span>
          {teamAvg.onTimePct != null && p.throughput.onTimePct != null && (
            <span>No prazo {p.throughput.onTimePct}% <span className="opacity-50">/ {teamAvg.onTimePct}%</span></span>
          )}
          <span>Health {p.outcomes.avgHealth} <span className="opacity-50">/ {teamAvg.avgHealth}</span></span>
        </div>
      )}
    </div>
  )
}

function DetailBlock({ title, rows }: { title: string; rows: [string, string][] }) {
  return (
    <div className="space-y-2">
      <p className="text-[9px] font-black uppercase tracking-widest text-plannera-orange/80">{title}</p>
      <div className="space-y-1">
        {rows.map(([k, v]) => (
          <div key={k} className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-content-secondary/70">{k}</span>
            <span className="text-[11px] font-black text-content-primary tabular-nums">{v}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
