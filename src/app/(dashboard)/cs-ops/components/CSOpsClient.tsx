'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import { RadarChart, Radar, PolarGrid, PolarAngleAxis, ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, Cell } from 'recharts'
import {
  Users, BarChart2, RefreshCw, AlertTriangle, CheckCircle2,
  ArrowRightLeft, Loader2, TrendingUp, Clock, Star
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { CockpitDashboard } from './CockpitDashboard'
import { ProductivityDashboard } from './ProductivityDashboard'

interface CSM { id: string; role: string }

interface CapacityData {
  csmId: string
  csmName: string
  accountsManaged: number
  totalMrr: number
  avgHealthScore: number
  capacityUtilizationPct: number
  workloadStatus: 'underutilized' | 'balanced' | 'at_capacity' | 'overloaded'
  hoursAllocatedWeekly: number
  billableUtilizationPct: number
}

interface MetricsData {
  teamSize: number
  avgCapacityUtilization: number
  overloadedCount: number
  underutilizedCount: number
  avgNps: number
  avgCsat: number
}

interface RebalanceSuggestion {
  suggestionId: string
  accountName: string
  currentCsmName: string
  suggestedCsmName: string
  recommendationScore: number
  rationale: string
  currentCsmUtilizationAfter: number
  suggestedCsmUtilizationAfter: number
}

const WORKLOAD_STYLES = {
  underutilized: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  balanced: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  at_capacity: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  overloaded: 'bg-red-500/10 text-red-600 border-red-500/20',
}

const WORKLOAD_LABELS = {
  underutilized: 'Sub-utilizado',
  balanced: 'Balanceado',
  at_capacity: 'No Limite',
  overloaded: 'Sobrecarregado',
}

interface CockpitData {
  accountsHealth: any[]
  delayedPlaybooks: any[]
  openRisks: any[]
  unassignedAccounts: any[]
}

export function CSOpsClient({ csms }: { csms: CSM[] }) {
  const [tab, setTab] = useState('productivity')
  const [capacities, setCapacities] = useState<CapacityData[]>([])
  const [metrics, setMetrics] = useState<MetricsData | null>(null)
  const [suggestions, setSuggestions] = useState<RebalanceSuggestion[]>([])
  const [cockpitData, setCockpitData] = useState<CockpitData | null>(null)
  const [loading, setLoading] = useState(true)
  const [rebalancing, setRebalancing] = useState(false)
  const [selectedSuggestions, setSelectedSuggestions] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [metricsRes, rebalRes, cockpitRes] = await Promise.all([
        fetch('/api/cs-ops/metrics'),
        fetch('/api/cs-ops/rebalancer'),
        fetch('/api/cs-ops/cockpit'),
      ])

      const capacityResults = await Promise.all(
        csms.map(csm => fetch(`/api/cs-ops/capacity?csmId=${csm.id}`).then(r => r.ok ? r.json() : null))
      )

      if (metricsRes.ok) setMetrics(await metricsRes.json())
      if (rebalRes.ok) {
        const rd = await rebalRes.json()
        setSuggestions(rd.suggestions ?? [])
      }
      if (cockpitRes.ok) setCockpitData(await cockpitRes.json())

      setCapacities(capacityResults.filter(Boolean))
    } catch {
      toast.error('Erro ao carregar dados de operações')
    } finally {
      setLoading(false)
    }
  }, [csms])

  useEffect(() => { load() }, [load])

  async function handleRebalance() {
    if (selectedSuggestions.size === 0) return toast.error('Selecione pelo menos uma sugestão')
    setRebalancing(true)
    try {
      const res = await fetch('/api/cs-ops/rebalancer', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ suggestionIds: Array.from(selectedSuggestions) }),
      })
      if (res.ok) {
        toast.success('Rebalanceamento executado com sucesso')
        setSelectedSuggestions(new Set())
        load()
      } else {
        toast.error('Erro ao executar rebalanceamento')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setRebalancing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* KPI Summary */}
      {metrics && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { label: 'Time CS', value: metrics.teamSize, icon: Users, color: 'text-plannera-primary' },
            { label: 'Utilização Média', value: `${metrics.avgCapacityUtilization}%`, icon: BarChart2, color: 'text-plannera-orange' },
            { label: 'Sobrecarregados', value: metrics.overloadedCount, icon: AlertTriangle, color: metrics.overloadedCount > 0 ? 'text-red-600' : 'text-emerald-600' },
            { label: 'Sub-utilizados', value: metrics.underutilizedCount, icon: TrendingUp, color: 'text-blue-600' },
          ].map((kpi, i) => {
            const Icon = kpi.icon
            return (
              <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                <Card className="p-4 bg-surface-card border border-border-divider rounded-2xl">
                  <div className="flex items-center justify-between mb-1">
                    <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary">{kpi.label}</p>
                    <Icon className={cn('w-4 h-4 opacity-60', kpi.color)} />
                  </div>
                  <p className={cn('text-2xl font-black tracking-tight', kpi.color)}>{kpi.value}</p>
                </Card>
              </motion.div>
            )
          })}
        </div>
      )}

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-surface-card border border-border-divider rounded-2xl p-1 h-auto gap-1">
          {[
            { value: 'productivity', label: 'Produtividade da Equipe' },
            { value: 'cockpit', label: 'Atenção Necessária' },
            { value: 'capacity', label: 'Capacity Planning' },
            { value: 'rebalancer', label: `Rebalancer${suggestions.length ? ` (${suggestions.length})` : ''}` },
          ].map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-2.5 data-[state=active]:bg-plannera-orange data-[state=active]:text-white data-[state=active]:shadow-lg"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="productivity" className="mt-6">
          <ProductivityDashboard />
        </TabsContent>

        <TabsContent value="cockpit" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
            </div>
          ) : (
            <CockpitDashboard data={cockpitData} onReload={load} />
          )}
        </TabsContent>

        {/* Capacity Tab */}
        <TabsContent value="capacity" className="mt-6">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
            </div>
          ) : (
            <div className="space-y-4">
              <AnimatePresence>
                {capacities.map((csm, idx) => (
                  <motion.div
                    key={csm.csmId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="p-5 border border-border-divider rounded-2xl bg-surface-card hover:border-border-divider/60 transition-all">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-2xl bg-plannera-primary/5 border border-plannera-primary/10 flex items-center justify-center text-[11px] font-black text-plannera-primary">
                            {csm.csmName?.slice(0, 2).toUpperCase() ?? 'CS'}
                          </div>
                          <div>
                            <p className="text-[11px] font-black uppercase tracking-tight text-content-primary">{csm.csmName ?? csm.csmId.slice(0, 8)}</p>
                            <Badge className={cn('text-[8px] font-black uppercase border mt-1', WORKLOAD_STYLES[csm.workloadStatus])}>
                              {WORKLOAD_LABELS[csm.workloadStatus]}
                            </Badge>
                          </div>
                        </div>

                        <div className="grid grid-cols-4 gap-6 text-right">
                          {[
                            { label: 'Contas', value: csm.accountsManaged },
                            { label: 'MRR', value: `R$ ${(csm.totalMrr / 1000).toFixed(0)}k` },
                            { label: 'Utilização', value: `${csm.capacityUtilizationPct}%` },
                            { label: 'Faturável', value: `${csm.billableUtilizationPct}%` },
                          ].map(stat => (
                            <div key={stat.label}>
                              <p className="text-[8px] font-black uppercase tracking-widest text-content-secondary opacity-60">{stat.label}</p>
                              <p className="text-[13px] font-black text-content-primary tabular-nums">{stat.value}</p>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Capacity Bar */}
                      <div className="mt-4 pt-4 border-t border-border-divider">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary opacity-60">Capacidade</p>
                          <span className="text-[9px] font-black text-content-primary">{csm.capacityUtilizationPct}%</span>
                        </div>
                        <div className="h-2 bg-surface-background rounded-full overflow-hidden border border-border-divider">
                          <div
                            className={cn(
                              'h-full rounded-full transition-all duration-700',
                              csm.capacityUtilizationPct > 120 ? 'bg-red-500'
                              : csm.capacityUtilizationPct > 90 ? 'bg-amber-500'
                              : csm.capacityUtilizationPct < 70 ? 'bg-blue-500'
                              : 'bg-emerald-500'
                            )}
                            style={{ width: `${Math.min(csm.capacityUtilizationPct, 100)}%` }}
                          />
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>

              {capacities.length === 0 && !loading && (
                <div className="text-center py-20 opacity-40">
                  <Users className="w-10 h-10 text-content-secondary mx-auto mb-3" />
                  <p className="text-[11px] font-black uppercase tracking-widest">Nenhum CSM encontrado</p>
                </div>
              )}
            </div>
          )}
        </TabsContent>

        {/* Rebalancer Tab */}
        <TabsContent value="rebalancer" className="mt-6 space-y-4">
          {suggestions.length === 0 ? (
            <div className="flex flex-col items-center py-20 opacity-40">
              <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-3" />
              <p className="text-[11px] font-black uppercase tracking-widest">Portfólio balanceado — sem sugestões</p>
            </div>
          ) : (
            <>
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
                  {selectedSuggestions.size} de {suggestions.length} selecionada{selectedSuggestions.size !== 1 ? 's' : ''}
                </p>
                <Button
                  onClick={handleRebalance}
                  disabled={rebalancing || selectedSuggestions.size === 0}
                  className="bg-plannera-orange hover:bg-plannera-orange/90 text-white text-[10px] font-black uppercase tracking-widest gap-2"
                >
                  {rebalancing ? <Loader2 className="w-4 h-4 animate-spin" /> : <ArrowRightLeft className="w-4 h-4" />}
                  Executar Rebalanceamento
                </Button>
              </div>

              <AnimatePresence>
                {suggestions.map((s, idx) => (
                  <motion.div
                    key={s.suggestionId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card
                      className={cn(
                        'p-4 border rounded-2xl bg-surface-card cursor-pointer transition-all',
                        selectedSuggestions.has(s.suggestionId)
                          ? 'border-plannera-orange/40 ring-1 ring-plannera-orange/20'
                          : 'border-border-divider hover:border-border-divider/60'
                      )}
                      onClick={() => {
                        const next = new Set(selectedSuggestions)
                        if (next.has(s.suggestionId)) next.delete(s.suggestionId)
                        else next.add(s.suggestionId)
                        setSelectedSuggestions(next)
                      }}
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1">
                          <div className="flex items-center gap-2 mb-1">
                            <p className="text-[11px] font-black uppercase tracking-tight text-content-primary">{s.accountName}</p>
                            <Badge className="bg-plannera-orange/10 text-plannera-orange border-plannera-orange/20 text-[8px] font-black uppercase">
                              Score: {Math.round(s.recommendationScore * 100)}%
                            </Badge>
                          </div>
                          <div className="flex items-center gap-2 text-[10px] text-content-secondary">
                            <span className="font-bold">{s.currentCsmName}</span>
                            <ArrowRightLeft className="w-3 h-3 text-plannera-orange" />
                            <span className="font-bold text-plannera-orange">{s.suggestedCsmName}</span>
                          </div>
                          <p className="text-[9px] text-content-secondary mt-1 opacity-70">{s.rationale}</p>
                        </div>
                        <div className="text-right shrink-0">
                          <p className="text-[8px] uppercase tracking-widest text-content-secondary opacity-60">Utilização após</p>
                          <p className="text-[11px] font-black text-content-secondary">{s.currentCsmUtilizationAfter}% → {s.suggestedCsmUtilizationAfter}%</p>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            </>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
