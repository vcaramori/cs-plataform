'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { motion, AnimatePresence } from 'framer-motion'
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Cell } from 'recharts'
import { RefreshCw, Search, AlertTriangle, Activity, Bug, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

interface Log {
  id: string
  level: 'debug' | 'info' | 'warn' | 'error'
  service: string
  message: string
  created_at: string
  metadata?: Record<string, unknown>
}

interface MetricSummary {
  metric_name: string
  avg: number
  min: number
  max: number
  count: number
}

interface ErrorEntry {
  id: string
  error_type: string
  message: string
  service: string
  created_at: string
  count?: number
}

const LOG_LEVEL_STYLES = {
  debug: 'bg-surface-background text-content-secondary border-border-divider',
  info: 'bg-blue-500/10 text-blue-600 border-blue-500/20',
  warn: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  error: 'bg-red-500/10 text-red-600 border-red-500/20',
}

export function ObservabilityClient() {
  const [tab, setTab] = useState('logs')
  const [logs, setLogs] = useState<Log[]>([])
  const [metrics, setMetrics] = useState<MetricSummary[]>([])
  const [errors, setErrors] = useState<ErrorEntry[]>([])
  const [loading, setLoading] = useState(true)
  const [levelFilter, setLevelFilter] = useState('all')
  const [search, setSearch] = useState('')

  const loadLogs = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams({ limit: '100' })
    if (levelFilter !== 'all') params.set('level', levelFilter)

    try {
      const [logsRes, metricsRes, errorsRes] = await Promise.all([
        fetch(`/api/observability/logs?${params}`),
        fetch('/api/observability/metrics?summary=true'),
        fetch('/api/observability/errors?limit=50'),
      ])

      if (logsRes.ok) {
        const d = await logsRes.json()
        setLogs(d.logs ?? [])
      }
      if (metricsRes.ok) {
        const d = await metricsRes.json()
        setMetrics(d.summary ?? [])
      }
      if (errorsRes.ok) {
        const d = await errorsRes.json()
        setErrors(d.errors ?? [])
      }
    } catch {
      toast.error('Erro ao carregar dados de observabilidade')
    } finally {
      setLoading(false)
    }
  }, [levelFilter])

  useEffect(() => { loadLogs() }, [loadLogs])

  const filteredLogs = logs.filter(l =>
    !search || l.message.toLowerCase().includes(search.toLowerCase()) || l.service.toLowerCase().includes(search.toLowerCase())
  )

  const errorCount = logs.filter(l => l.level === 'error').length
  const warnCount = logs.filter(l => l.level === 'warn').length

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Total Logs (24h)', value: logs.length, icon: Activity, color: 'text-plannera-primary' },
          { label: 'Warnings', value: warnCount, icon: AlertTriangle, color: 'text-amber-600' },
          { label: 'Errors', value: errorCount, icon: Bug, color: errorCount > 0 ? 'text-red-600' : 'text-emerald-600' },
        ].map((kpi, i) => {
          const Icon = kpi.icon
          return (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4 bg-surface-card border border-border-divider rounded-2xl">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary">{kpi.label}</p>
                  <Icon className={cn('w-4 h-4 opacity-60', kpi.color)} />
                </div>
                <p className={cn('text-2xl font-black', kpi.color)}>{kpi.value}</p>
              </Card>
            </motion.div>
          )
        })}
      </div>

      <Tabs value={tab} onValueChange={setTab}>
        <TabsList className="bg-surface-card border border-border-divider rounded-2xl p-1 h-auto gap-1">
          {[
            { value: 'logs', label: 'Application Logs' },
            { value: 'metrics', label: 'Métricas' },
            { value: 'errors', label: `Erros${errors.length ? ` (${errors.length})` : ''}` },
          ].map(t => (
            <TabsTrigger
              key={t.value}
              value={t.value}
              className="text-[10px] font-black uppercase tracking-widest rounded-xl px-5 py-2.5 data-[state=active]:bg-plannera-orange data-[state=active]:text-white"
            >
              {t.label}
            </TabsTrigger>
          ))}
        </TabsList>

        {/* Logs Tab */}
        <TabsContent value="logs" className="mt-6 space-y-4">
          <div className="flex items-center gap-3">
            <div className="relative flex-1 max-w-sm">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-content-secondary" />
              <Input
                value={search}
                onChange={e => setSearch(e.target.value)}
                placeholder="Filtrar por mensagem ou serviço..."
                className="pl-9 h-9 text-[10px] bg-surface-background/50 border-border-divider rounded-xl"
              />
            </div>
            <Select value={levelFilter} onValueChange={setLevelFilter}>
              <SelectTrigger className="w-32 h-9 text-[10px] font-black uppercase bg-surface-background/50 border-border-divider rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-surface-card border-border-divider">
                <SelectItem value="all">Todos Níveis</SelectItem>
                <SelectItem value="error">Error</SelectItem>
                <SelectItem value="warn">Warn</SelectItem>
                <SelectItem value="info">Info</SelectItem>
                <SelectItem value="debug">Debug</SelectItem>
              </SelectContent>
            </Select>
            <Button variant="ghost" size="icon" onClick={loadLogs} className="w-9 h-9 rounded-xl border border-border-divider">
              <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
            </Button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
            </div>
          ) : (
            <Card className="border border-border-divider rounded-2xl overflow-hidden bg-surface-card">
              <div className="max-h-[500px] overflow-y-auto font-mono text-[10px]">
                <AnimatePresence>
                  {filteredLogs.length === 0 ? (
                    <div className="p-8 text-center text-content-secondary opacity-40">
                      <p className="font-black uppercase tracking-widest">Nenhum log encontrado</p>
                    </div>
                  ) : (
                    filteredLogs.map((log, idx) => (
                      <motion.div
                        key={log.id}
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: Math.min(idx * 0.01, 0.3) }}
                        className="flex items-start gap-3 px-4 py-2.5 border-b border-border-divider/50 hover:bg-surface-background/50 transition-colors"
                      >
                        <Badge className={cn('text-[7px] font-black uppercase shrink-0 border mt-0.5', LOG_LEVEL_STYLES[log.level])}>
                          {log.level}
                        </Badge>
                        <span className="text-content-secondary opacity-40 shrink-0">
                          {new Date(log.created_at).toLocaleTimeString('pt-BR')}
                        </span>
                        <span className="text-plannera-orange shrink-0">[{log.service}]</span>
                        <span className="text-content-primary flex-1 break-all">{log.message}</span>
                      </motion.div>
                    ))
                  )}
                </AnimatePresence>
              </div>
            </Card>
          )}
        </TabsContent>

        {/* Metrics Tab */}
        <TabsContent value="metrics" className="mt-6">
          {metrics.length === 0 ? (
            <div className="text-center py-20 opacity-40">
              <Activity className="w-10 h-10 text-content-secondary mx-auto mb-3" />
              <p className="text-[11px] font-black uppercase tracking-widest">Nenhuma métrica coletada</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {metrics.map((m, i) => (
                <motion.div key={m.metric_name} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
                  <Card className="p-4 border border-border-divider rounded-2xl bg-surface-card">
                    <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary mb-3">{m.metric_name}</p>
                    <div className="grid grid-cols-3 gap-2 text-center mb-3">
                      {[
                        { label: 'Avg', value: m.avg?.toFixed(2) ?? '—' },
                        { label: 'Min', value: m.min?.toFixed(2) ?? '—' },
                        { label: 'Max', value: m.max?.toFixed(2) ?? '—' },
                      ].map(s => (
                        <div key={s.label} className="p-2 bg-surface-background rounded-xl border border-border-divider">
                          <p className="text-[8px] uppercase tracking-widest text-content-secondary opacity-60">{s.label}</p>
                          <p className="text-[13px] font-black text-plannera-orange">{s.value}</p>
                        </div>
                      ))}
                    </div>
                    <div className="h-12">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={[{ name: m.metric_name, avg: m.avg, min: m.min, max: m.max }]}>
                          <Bar dataKey="avg" fill="var(--plannera-orange)" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </div>
          )}
        </TabsContent>

        {/* Errors Tab */}
        <TabsContent value="errors" className="mt-6 space-y-3">
          {errors.length === 0 ? (
            <div className="flex flex-col items-center py-20 opacity-40">
              <Bug className="w-10 h-10 text-emerald-600 mb-3" />
              <p className="text-[11px] font-black uppercase tracking-widest">Nenhum erro registrado</p>
            </div>
          ) : (
            <AnimatePresence>
              {errors.map((err, idx) => (
                <motion.div
                  key={err.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.03 }}
                >
                  <Card className="p-4 border-l-4 border-l-red-500 border border-border-divider rounded-2xl bg-surface-card">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <p className="text-[11px] font-black uppercase text-red-600">{err.error_type}</p>
                          <Badge variant="outline" className="text-[8px] font-black uppercase">{err.service}</Badge>
                          {err.count && err.count > 1 && (
                            <Badge className="bg-red-500/10 text-red-600 border-red-500/20 text-[8px] font-black">×{err.count}</Badge>
                          )}
                        </div>
                        <p className="text-[10px] text-content-secondary font-mono">{err.message}</p>
                      </div>
                      <p className="text-[8px] text-content-secondary/40 shrink-0">
                        {new Date(err.created_at).toLocaleString('pt-BR')}
                      </p>
                    </div>
                  </Card>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
