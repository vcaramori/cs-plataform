'use client'

import { useState } from 'react'
import Link from 'next/link'
import { motion } from 'framer-motion'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Cell,
} from 'recharts'
import {
  Rocket, AlertTriangle, ShieldAlert, TrendingDown, Layers, Users, Ban, ChevronRight,
} from 'lucide-react'
import { Card, CardContent } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { SectionHeader } from '@/components/ui/section-header'
import { StatCardPremium } from '@/components/shared/guardians/StatCardPremium'
import { cn } from '@/lib/utils'
import type { PortfolioAdoption, PlanAdoption, PlanFeatureRank } from '@/lib/adoption/portfolio-adoption'

const BLOCKER_LABELS: Record<string, string> = {
  data_integration: 'Integração de dados',
  product_roadmap: 'Roadmap de produto',
  people_process: 'Pessoas & Processo',
  governance: 'Governança',
  no_strategic_relevance: 'Sem relevância estratégica',
  other: 'Outros',
}

const PLAN_ACCENT = ['bg-plannera-ds', 'bg-plannera-operations', 'bg-emerald-500', 'bg-plannera-sop']

function scoreColor(score: number) {
  if (score >= 70) return 'text-emerald-500'
  if (score >= 40) return 'text-plannera-operations'
  return 'text-red-500'
}

function FeatureRankList({
  items,
  variant,
}: {
  items: PlanFeatureRank[]
  variant: 'adopted' | 'not_adopted'
}) {
  if (items.length === 0) {
    return (
      <div className="py-6 text-center border border-dashed border-border-divider rounded-xl">
        <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">
          Sem dados de adoção
        </p>
      </div>
    )
  }
  const barColor = variant === 'adopted' ? 'bg-emerald-500' : 'bg-red-500'
  const pctColor = variant === 'adopted' ? 'text-emerald-500' : 'text-red-500'
  return (
    <div className="space-y-2.5">
      {items.map((it, i) => (
        <div key={`${it.feature}-${i}`} className="space-y-1">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <span className="text-[11px] font-bold text-content-primary truncate">{it.feature}</span>
              {it.module && (
                <Badge className="bg-surface-background text-content-secondary border-none text-[8px] font-black uppercase tracking-tight h-4 px-1.5 shrink-0">
                  {it.module}
                </Badge>
              )}
              {it.is_differentiator && (
                <Badge className="bg-red-500/15 text-red-500 border-none text-[8px] font-black uppercase tracking-tight h-4 px-1.5 shrink-0">
                  Diferenciador
                </Badge>
              )}
            </div>
            <span className={cn('text-[11px] font-black shrink-0', pctColor)}>{it.pct}%</span>
          </div>
          <div className="relative h-1.5 w-full bg-surface-background rounded-full overflow-hidden">
            <div className={cn('absolute top-0 left-0 h-full rounded-full', barColor)} style={{ width: `${it.pct}%` }} />
          </div>
        </div>
      ))}
    </div>
  )
}

export function AdoptionPortfolioClient({ data }: { data: PortfolioAdoption }) {
  const { kpis, plans, blockers_by_category, downgrade_risks } = data
  const plansWithData = plans.filter(p => p.account_count > 0)
  const [selectedPlanId, setSelectedPlanId] = useState<string>(
    (plansWithData[0] ?? plans[0])?.plan_id ?? ''
  )
  const selectedPlan = plans.find(p => p.plan_id === selectedPlanId) ?? plans[0]

  const blockerChart = blockers_by_category.map(b => ({
    name: BLOCKER_LABELS[b.category] ?? b.category,
    count: b.count,
  }))

  return (
    <div className="space-y-8">
      {/* KPIs */}
      <div className="grid grid-cols-2 lg:grid-cols-5 gap-3">
        <StatCardPremium title="Score Médio de Adoção" value={kpis.avg_adoption_score} suffix="%" iconName="Gauge" colorVariant="orange" status="Média entre planos" />
        <StatCardPremium title="Features em Uso" value={kpis.features_in_use_pct} suffix="%" iconName="Rocket" colorVariant="emerald" status="Do total aplicável" />
        <StatCardPremium title="Features Bloqueadas" value={kpis.blocked_pct} suffix="%" iconName="Ban" colorVariant="destructive" status="Barreiras ativas" />
        <StatCardPremium title="Contas em Downgrade Risk" value={kpis.downgrade_risk_count} iconName="ShieldAlert" colorVariant="demand" status="Sub-adoção do plano" />
        <StatCardPremium title="Total de Contas" value={kpis.total_accounts} iconName="Building2" colorVariant="default" status="Portfólio" />
      </div>

      {/* Adoção por plano */}
      <div className="space-y-4">
        <SectionHeader title="Adoção por Plano" subtitle="Score de adoção e distribuição de status por tier contratual" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {plans.map((plan, idx) => (
            <PlanCard
              key={plan.plan_id}
              plan={plan}
              accent={PLAN_ACCENT[idx % PLAN_ACCENT.length]}
              selected={plan.plan_id === selectedPlanId}
              onSelect={() => setSelectedPlanId(plan.plan_id)}
            />
          ))}
        </div>
      </div>

      {/* TOP features do plano selecionado */}
      {selectedPlan && (
        <div className="space-y-4">
          <SectionHeader
            title="Funcionalidades por Plano"
            subtitle={`Ranking de adoção — plano ${selectedPlan.plan_name}`}
          />
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <Rocket className="w-4 h-4 text-emerald-500" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-content-primary">Top Adotadas</h3>
                </div>
                <FeatureRankList items={selectedPlan.top_adopted} variant="adopted" />
              </CardContent>
            </Card>
            <Card>
              <CardContent className="p-5 space-y-4">
                <div className="flex items-center gap-2">
                  <AlertTriangle className="w-4 h-4 text-red-500" />
                  <h3 className="text-[11px] font-black uppercase tracking-widest text-content-primary">Top Não Adotadas</h3>
                </div>
                <FeatureRankList items={selectedPlan.top_not_adopted} variant="not_adopted" />
              </CardContent>
            </Card>
          </div>
        </div>
      )}

      {/* Blockers + Downgrade risk */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <div className="space-y-4">
          <SectionHeader title="Barreiras por Categoria" subtitle="O que trava a adoção no portfólio" />
          <Card>
            <CardContent className="p-5">
              {blockerChart.length === 0 ? (
                <div className="py-10 text-center">
                  <Ban className="w-6 h-6 text-content-secondary/40 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Nenhuma barreira registrada</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height={Math.max(160, blockerChart.length * 48)}>
                  <BarChart data={blockerChart} layout="vertical" margin={{ left: 8, right: 16 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="currentColor" className="text-border-divider/40" />
                    <XAxis type="number" allowDecimals={false} tick={{ fontSize: 10 }} stroke="currentColor" className="text-content-secondary" />
                    <YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 10 }} stroke="currentColor" className="text-content-secondary" />
                    <Tooltip
                      cursor={{ fill: 'rgba(127,127,127,0.08)' }}
                      contentStyle={{ background: 'hsl(var(--surface-card))', border: '1px solid hsl(var(--border-divider))', borderRadius: 12, fontSize: 11 }}
                    />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]} barSize={18}>
                      {blockerChart.map((_, i) => (
                        <Cell key={i} fill="#d85d4b" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-4">
          <SectionHeader title="Risco de Downgrade" subtitle="Contas sub-adotando features que justificam o plano" />
          <Card>
            <CardContent className="p-3 space-y-2">
              {downgrade_risks.length === 0 ? (
                <div className="py-10 text-center">
                  <ShieldAlert className="w-6 h-6 text-content-secondary/40 mx-auto mb-2" />
                  <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary italic">Nenhuma conta em risco de downgrade</p>
                </div>
              ) : (
                downgrade_risks.map((r, i) => (
                  <Link
                    key={`${r.name}-${i}`}
                    href={`/accounts?q=${encodeURIComponent(r.name)}`}
                    className="block group"
                  >
                    <motion.div
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: i * 0.03 }}
                      className="flex items-center gap-3 p-3 rounded-xl border border-border-divider hover:border-plannera-demand/40 hover:bg-surface-background transition-colors"
                    >
                      <div className={cn('p-2 rounded-lg shrink-0', r.risk === 'high' ? 'bg-red-500/15' : 'bg-amber-500/15')}>
                        {r.risk === 'high' ? <ShieldAlert className="w-4 h-4 text-red-500" /> : <TrendingDown className="w-4 h-4 text-amber-500" />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-2">
                          <span className="text-[12px] font-black text-content-primary truncate">{r.name}</span>
                          <Badge className="bg-surface-background text-content-secondary border-none text-[8px] font-black uppercase tracking-tight h-4 px-1.5 shrink-0">{r.plan}</Badge>
                        </div>
                        {r.features.length > 0 && (
                          <p className="text-[10px] text-content-secondary truncate mt-0.5">
                            {r.features.join(' · ')}
                          </p>
                        )}
                      </div>
                      <Badge className={cn('border-none text-[8px] font-black uppercase tracking-tight shrink-0', r.risk === 'high' ? 'bg-red-500/15 text-red-500' : 'bg-amber-500/15 text-amber-600')}>
                        {r.risk === 'high' ? 'Alto' : 'Médio'}
                      </Badge>
                      <ChevronRight className="w-4 h-4 text-content-secondary/40 group-hover:text-content-secondary shrink-0" />
                    </motion.div>
                  </Link>
                ))
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

function PlanCard({
  plan,
  accent,
  selected,
  onSelect,
}: {
  plan: PlanAdoption
  accent: string
  selected: boolean
  onSelect: () => void
}) {
  const { status_counts } = plan
  const segments = [
    { key: 'in_use', label: 'Em uso', count: status_counts.in_use, color: 'bg-emerald-500' },
    { key: 'partial', label: 'Parcial', count: status_counts.partial, color: 'bg-plannera-operations' },
    { key: 'blocked', label: 'Bloqueio', count: status_counts.blocked, color: 'bg-red-500' },
    { key: 'not_started', label: 'Não iniciado', count: status_counts.not_started, color: 'bg-content-secondary/40' },
    { key: 'na', label: 'N/A', count: status_counts.na, color: 'bg-content-secondary/20' },
  ]
  const totalSeg = segments.reduce((s, x) => s + x.count, 0)

  return (
    <button type="button" onClick={onSelect} className="text-left">
      <Card
        className={cn(
          'relative overflow-hidden transition-all hover:-translate-y-0.5',
          selected ? 'border-plannera-operations/60 shadow-premium' : 'hover:border-border-divider'
        )}
      >
        <div className={cn('absolute top-0 left-0 right-0 h-1', accent, selected ? 'opacity-100' : 'opacity-50')} />
        <CardContent className="p-5 space-y-4">
          <div className="flex items-start justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="w-4 h-4 text-content-secondary" />
              <div>
                <h3 className="text-sm font-black uppercase tracking-widest text-content-primary leading-none">{plan.plan_name}</h3>
                <p className="text-[9px] font-bold uppercase tracking-tight text-content-secondary mt-1 flex items-center gap-1">
                  <Users className="w-3 h-3" /> {plan.account_count} conta{plan.account_count === 1 ? '' : 's'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <span className={cn('text-2xl font-black leading-none', scoreColor(plan.adoption_score))}>{plan.adoption_score}%</span>
              <p className="text-[8px] font-bold uppercase tracking-widest text-content-secondary mt-0.5">Adoção</p>
            </div>
          </div>

          {/* barra de distribuição de status */}
          <div className="flex h-2 w-full rounded-full overflow-hidden bg-surface-background">
            {totalSeg === 0 ? (
              <div className="h-full w-full bg-content-secondary/10" />
            ) : (
              segments.map(s => s.count > 0 && (
                <div key={s.key} className={cn('h-full', s.color)} style={{ width: `${(s.count / totalSeg) * 100}%` }} title={`${s.label}: ${s.count}`} />
              ))
            )}
          </div>
          <div className="flex flex-wrap gap-x-3 gap-y-1">
            {segments.map(s => (
              <span key={s.key} className="flex items-center gap-1 text-[9px] font-bold text-content-secondary">
                <span className={cn('w-2 h-2 rounded-full', s.color)} /> {s.label} {s.count}
              </span>
            ))}
          </div>
        </CardContent>
      </Card>
    </button>
  )
}
