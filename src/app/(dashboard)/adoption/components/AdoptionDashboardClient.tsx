'use client'

import { useState, useCallback } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell
} from 'recharts'
import {
  TrendingUp, TrendingDown, Minus, AlertTriangle, CheckCircle2,
  Zap, ShieldAlert, RefreshCw, Target, Loader2
} from 'lucide-react'
import { cn } from '@/lib/utils'

interface Account { id: string; name: string; health_score: number }

interface HeatmapData {
  accountId: string
  accountName: string
  data: Array<{
    featureId: string
    featureName: string
    adoptionHistory: Array<{ date: string; adoptionPct: number }>
  }>
  summary: {
    overallAdoptionPct: number
    adoptionTrend: 'accelerating' | 'stable' | 'declining'
    featuresAdopted: number
    featuresTotal: number
    topFeatures: string[]
    bottomFeatures: string[]
  }
}

interface Blocker {
  blockerId: string
  featureName: string
  blockerType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  description: string
}

interface ForecastData {
  accountName: string
  forecastDays: number
  baselineAdoptionPct: number
  forecastedAdoptionPct: number
  forecastedDate: string
  confidence: number
  forecastTrend: 'accelerating' | 'stable' | 'declining'
  recommendations: string[]
}

const SEVERITY_COLORS: Record<string, string> = {
  critical: 'text-red-600 bg-red-500/10 border-red-500/20',
  high: 'text-orange-600 bg-orange-500/10 border-orange-500/20',
  medium: 'text-amber-600 bg-amber-500/10 border-amber-500/20',
  low: 'text-blue-600 bg-blue-500/10 border-blue-500/20',
}

const TREND_ICON = {
  accelerating: TrendingUp,
  stable: Minus,
  declining: TrendingDown,
}

const TREND_COLOR = {
  accelerating: 'text-emerald-600',
  stable: 'text-content-secondary',
  declining: 'text-red-600',
}

export function AdoptionDashboardClient({ accounts }: { accounts: Account[] }) {
  const [selectedAccountId, setSelectedAccountId] = useState<string>('')
  const [tab, setTab] = useState('heatmap')
  const [heatmap, setHeatmap] = useState<HeatmapData | null>(null)
  const [blockers, setBlockers] = useState<Blocker[]>([])
  const [forecast, setForecast] = useState<ForecastData | null>(null)
  const [loading, setLoading] = useState(false)

  const selectedAccount = accounts.find(a => a.id === selectedAccountId)

  const loadData = useCallback(async (accountId: string) => {
    setLoading(true)
    setHeatmap(null)
    setBlockers([])
    setForecast(null)

    try {
      const [heatmapRes, blockersRes, forecastRes] = await Promise.all([
        fetch(`/api/adoption/heatmap?accountId=${accountId}`),
        fetch(`/api/adoption/blockers?accountId=${accountId}`),
        fetch('/api/adoption/forecast', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ accountId, forecastDays: 90 }),
        }),
      ])

      if (heatmapRes.ok) setHeatmap(await heatmapRes.json())
      if (blockersRes.ok) {
        const bd = await blockersRes.json()
        setBlockers(bd.blockers ?? [])
      }
      if (forecastRes.ok) setForecast(await forecastRes.json())
    } catch {
      toast.error('Erro ao carregar dados de adoção')
    } finally {
      setLoading(false)
    }
  }, [])

  function handleAccountChange(id: string) {
    setSelectedAccountId(id)
    if (id) loadData(id)
  }

  return (
    <div className="space-y-6">
      {/* Account Selector */}
      <div className="flex items-center gap-4 p-4 bg-surface-card border border-border-divider rounded-2xl">
        <div className="flex-1 max-w-sm">
          <SearchableSelect
            value={selectedAccountId}
            onValueChange={handleAccountChange}
            options={accounts.map(a => ({ label: a.name, value: a.id }))}
            placeholder="Selecionar conta..."
          />
        </div>
        {selectedAccount && (
          <>
            <Badge className={cn(
              'font-black text-[9px] uppercase tracking-widest',
              selectedAccount.health_score >= 70 ? 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20'
              : selectedAccount.health_score >= 40 ? 'bg-amber-500/10 text-amber-600 border-amber-500/20'
              : 'bg-red-500/10 text-red-600 border-red-500/20'
            )}>
              Health: {selectedAccount.health_score}%
            </Badge>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => loadData(selectedAccountId)}
              className="w-9 h-9 rounded-xl border border-border-divider"
            >
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </>
        )}
      </div>

      {!selectedAccountId ? (
        <div className="flex flex-col items-center justify-center py-32 text-center opacity-40">
          <Target className="w-12 h-12 text-content-secondary mb-4" />
          <p className="text-[11px] font-black uppercase tracking-[0.3em]">Selecione uma conta para analisar adoção</p>
        </div>
      ) : loading ? (
        <div className="flex items-center justify-center py-32">
          <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
        </div>
      ) : (
        <Tabs value={tab} onValueChange={setTab}>
          <TabsList className="bg-surface-card border border-border-divider rounded-2xl p-1 h-auto gap-1">
            {[
              { value: 'heatmap', label: 'Heatmap' },
              { value: 'blockers', label: `Blockers${blockers.length ? ` (${blockers.length})` : ''}` },
              { value: 'forecast', label: 'Forecast' },
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

          {/* Heatmap Tab */}
          <TabsContent value="heatmap" className="space-y-6 mt-6">
            {heatmap ? (
              <>
                {/* Summary KPIs */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {[
                    { label: 'Adoção Global', value: `${heatmap.summary.overallAdoptionPct}%`, color: 'text-plannera-orange' },
                    { label: 'Features Adotadas', value: `${heatmap.summary.featuresAdopted}/${heatmap.summary.featuresTotal}`, color: 'text-emerald-600' },
                    { label: 'Tendência', value: heatmap.summary.adoptionTrend, color: TREND_COLOR[heatmap.summary.adoptionTrend] },
                    { label: 'Top Feature', value: heatmap.summary.topFeatures[0] ?? '—', color: 'text-blue-600' },
                  ].map((kpi, i) => (
                    <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="p-4 bg-surface-card border border-border-divider rounded-2xl">
                        <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary mb-1">{kpi.label}</p>
                        <p className={cn('text-lg font-black tracking-tight', kpi.color)}>{kpi.value}</p>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {/* Feature Heatmap Charts */}
                <Card className="border border-border-divider rounded-2xl overflow-hidden bg-surface-card">
                  <CardHeader className="border-b border-border-divider p-4">
                    <CardTitle className="text-[11px] font-black uppercase tracking-widest text-content-primary">Evolução por Feature</CardTitle>
                  </CardHeader>
                  <CardContent className="p-4 space-y-4 max-h-[480px] overflow-y-auto">
                    <AnimatePresence>
                      {heatmap.data.map((feature, idx) => {
                        const latest = feature.adoptionHistory[feature.adoptionHistory.length - 1]?.adoptionPct ?? 0
                        return (
                          <motion.div
                            key={feature.featureId}
                            initial={{ opacity: 0, x: -8 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: idx * 0.03 }}
                            className="space-y-1"
                          >
                            <div className="flex items-center justify-between">
                              <p className="text-[10px] font-black text-content-primary uppercase tracking-tight">{feature.featureName}</p>
                              <span className={cn('text-[10px] font-black', latest >= 70 ? 'text-emerald-600' : latest >= 40 ? 'text-amber-600' : 'text-red-600')}>
                                {latest}%
                              </span>
                            </div>
                            <div className="h-16">
                              <ResponsiveContainer width="100%" height="100%">
                                <AreaChart data={feature.adoptionHistory}>
                                  <defs>
                                    <linearGradient id={`grad-${idx}`} x1="0" y1="0" x2="0" y2="1">
                                      <stop offset="5%" stopColor="var(--plannera-orange)" stopOpacity={0.3} />
                                      <stop offset="95%" stopColor="var(--plannera-orange)" stopOpacity={0} />
                                    </linearGradient>
                                  </defs>
                                  <Area type="monotone" dataKey="adoptionPct" stroke="var(--plannera-orange)" fill={`url(#grad-${idx})`} strokeWidth={1.5} dot={false} />
                                </AreaChart>
                              </ResponsiveContainer>
                            </div>
                          </motion.div>
                        )
                      })}
                    </AnimatePresence>
                  </CardContent>
                </Card>
              </>
            ) : (
              <div className="text-center py-20 opacity-40">
                <p className="text-[11px] font-black uppercase tracking-widest">Sem dados de heatmap</p>
              </div>
            )}
          </TabsContent>

          {/* Blockers Tab */}
          <TabsContent value="blockers" className="space-y-4 mt-6">
            {blockers.length === 0 ? (
              <div className="flex flex-col items-center py-20 opacity-40">
                <CheckCircle2 className="w-10 h-10 text-emerald-600 mb-3" />
                <p className="text-[11px] font-black uppercase tracking-widest">Nenhum blocker identificado</p>
              </div>
            ) : (
              <AnimatePresence>
                {blockers.map((b, idx) => (
                  <motion.div
                    key={b.blockerId}
                    initial={{ opacity: 0, y: 8 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: idx * 0.05 }}
                  >
                    <Card className="p-4 border border-border-divider rounded-2xl bg-surface-card hover:border-border-divider/60 transition-all">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex items-start gap-3 flex-1">
                          <ShieldAlert className="w-4 h-4 mt-0.5 text-content-secondary shrink-0" />
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <p className="text-[11px] font-black uppercase tracking-tight text-content-primary">{b.featureName}</p>
                              <Badge className={cn('text-[8px] font-black uppercase border', SEVERITY_COLORS[b.severity] ?? '')}>
                                {b.severity}
                              </Badge>
                              <Badge variant="outline" className="text-[8px] font-black uppercase">
                                {b.blockerType}
                              </Badge>
                            </div>
                            <p className="text-[10px] text-content-secondary">{b.description}</p>
                          </div>
                        </div>
                      </div>
                    </Card>
                  </motion.div>
                ))}
              </AnimatePresence>
            )}
          </TabsContent>

          {/* Forecast Tab */}
          <TabsContent value="forecast" className="space-y-6 mt-6">
            {forecast ? (
              <>
                <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                  {[
                    { label: 'Adoção Atual', value: `${forecast.baselineAdoptionPct}%`, sub: 'Baseline' },
                    { label: `Forecast ${forecast.forecastDays}d`, value: `${forecast.forecastedAdoptionPct}%`, sub: `Até ${new Date(forecast.forecastedDate).toLocaleDateString('pt-BR')}` },
                    { label: 'Confiança', value: `${Math.round(forecast.confidence * 100)}%`, sub: forecast.forecastTrend },
                  ].map((kpi, i) => (
                    <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                      <Card className="p-5 border border-border-divider rounded-2xl bg-surface-card text-center">
                        <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary mb-2">{kpi.label}</p>
                        <p className="text-3xl font-black text-plannera-orange tracking-tight">{kpi.value}</p>
                        <p className="text-[9px] text-content-secondary mt-1 uppercase tracking-wider">{kpi.sub}</p>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                {forecast.recommendations.length > 0 && (
                  <Card className="border border-border-divider rounded-2xl bg-surface-card">
                    <CardHeader className="border-b border-border-divider p-4">
                      <CardTitle className="text-[11px] font-black uppercase tracking-widest flex items-center gap-2">
                        <Zap className="w-4 h-4 text-plannera-orange" />
                        Recomendações de IA
                      </CardTitle>
                    </CardHeader>
                    <CardContent className="p-4 space-y-2">
                      {forecast.recommendations.map((rec, i) => (
                        <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }}
                          className="flex items-start gap-3 p-3 bg-surface-background rounded-xl border border-border-divider">
                          <div className="w-5 h-5 rounded-full bg-plannera-orange/10 border border-plannera-orange/20 flex items-center justify-center text-[9px] font-black text-plannera-orange shrink-0">
                            {i + 1}
                          </div>
                          <p className="text-[11px] text-content-secondary">{rec}</p>
                        </motion.div>
                      ))}
                    </CardContent>
                  </Card>
                )}
              </>
            ) : (
              <div className="text-center py-20 opacity-40">
                <TrendingUp className="w-10 h-10 text-content-secondary mx-auto mb-3" />
                <p className="text-[11px] font-black uppercase tracking-widest">Sem dados de forecast</p>
              </div>
            )}
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
