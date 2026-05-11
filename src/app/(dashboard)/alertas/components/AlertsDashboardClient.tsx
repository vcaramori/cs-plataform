'use client'

import { useState, useCallback, useEffect } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { motion, AnimatePresence } from 'framer-motion'
import { toast } from 'sonner'
import {
  AlertTriangle, CheckCircle2, Clock, RefreshCw, BellOff,
  Filter, Loader2, ChevronRight, ShieldAlert
} from 'lucide-react'
import { cn } from '@/lib/utils'
import Link from 'next/link'

interface RiskFactor {
  factor: string
  weight: number
  evidence?: string
}

interface Alert {
  alertId: string
  accountId: string
  accountName: string
  alertType: string
  severity: 'low' | 'medium' | 'high' | 'critical'
  status: 'active' | 'acknowledged' | 'resolved' | 'dismissed'
  riskScore: number
  riskFactors: RiskFactor[]
  recommendedAction: string
  triggeredAt: string
}

interface Summary {
  totalAlerts: number
  criticalCount: number
  highCount: number
  mediumCount: number
  lowCount: number
  activeCount: number
}

const SEVERITY_STYLES = {
  critical: { badge: 'bg-red-500/10 text-red-600 border-red-500/20', bar: 'bg-red-500', glow: 'border-l-red-500' },
  high: { badge: 'bg-orange-500/10 text-orange-600 border-orange-500/20', bar: 'bg-orange-500', glow: 'border-l-orange-500' },
  medium: { badge: 'bg-amber-500/10 text-amber-600 border-amber-500/20', bar: 'bg-amber-500', glow: 'border-l-amber-400' },
  low: { badge: 'bg-blue-500/10 text-blue-600 border-blue-500/20', bar: 'bg-blue-500', glow: 'border-l-blue-400' },
}

const ALERT_TYPE_LABELS: Record<string, string> = {
  churn_risk: 'Risco de Churn',
  anomaly: 'Anomalia',
  sentiment_trigger: 'Sentimento',
  contract_risk: 'Risco de Contrato',
  adoption_cliff: 'Queda de Adoção',
  custom: 'Customizado',
}

const SNOOZE_OPTIONS = [
  { label: '1 hora', hours: 1 },
  { label: '24 horas', hours: 24 },
  { label: '7 dias', hours: 168 },
  { label: '30 dias', hours: 720 },
]

export function AlertsDashboardClient() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [summary, setSummary] = useState<Summary | null>(null)
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState('active')
  const [severityFilter, setSeverityFilter] = useState('all')
  const [snoozeDialog, setSnoozeDialog] = useState<Alert | null>(null)
  const [snoozing, setSnoozing] = useState(false)
  const [acting, setActing] = useState<Set<string>>(new Set())

  const load = useCallback(async () => {
    setLoading(true)
    const params = new URLSearchParams()
    if (statusFilter !== 'all') params.set('status', statusFilter)
    if (severityFilter !== 'all') params.set('severity', severityFilter)

    try {
      const res = await fetch(`/api/alerts?${params}`)
      if (res.ok) {
        const data = await res.json()
        setAlerts(data.alerts ?? [])
        setSummary(data.summary ?? null)
      }
    } catch {
      toast.error('Erro ao carregar alertas')
    } finally {
      setLoading(false)
    }
  }, [statusFilter, severityFilter])

  useEffect(() => { load() }, [load])

  async function handleAcknowledge(alertIds: string[]) {
    setActing(prev => new Set([...prev, ...alertIds]))
    try {
      const res = await fetch('/api/alerts/acknowledge', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds }),
      })
      if (res.ok) {
        toast.success('Alerta reconhecido')
        load()
      } else {
        toast.error('Erro ao reconhecer alerta')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setActing(prev => {
        const next = new Set(prev)
        alertIds.forEach(id => next.delete(id))
        return next
      })
    }
  }

  async function handleResolve(alertIds: string[]) {
    setActing(prev => new Set([...prev, ...alertIds]))
    try {
      const res = await fetch('/api/alerts/resolve', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds }),
      })
      if (res.ok) {
        toast.success('Alerta resolvido')
        load()
      } else {
        toast.error('Erro ao resolver alerta')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setActing(prev => {
        const next = new Set(prev)
        alertIds.forEach(id => next.delete(id))
        return next
      })
    }
  }

  async function handleSnooze(hours: number) {
    if (!snoozeDialog) return
    setSnoozing(true)
    const snoozedUntil = new Date(Date.now() + hours * 60 * 60 * 1000).toISOString()
    try {
      const res = await fetch('/api/alerts/snooze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alertIds: [snoozeDialog.alertId], snoozedUntil }),
      })
      if (res.ok) {
        toast.success(`Alerta pausado por ${hours >= 168 ? `${hours / 24} dias` : `${hours}h`}`)
        setSnoozeDialog(null)
        load()
      } else {
        toast.error('Erro ao pausar alerta')
      }
    } catch {
      toast.error('Erro de conexão')
    } finally {
      setSnoozing(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Summary KPIs */}
      {summary && (
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {[
            { label: 'Total', value: summary.totalAlerts, color: 'text-content-primary' },
            { label: 'Críticos', value: summary.criticalCount, color: 'text-red-600' },
            { label: 'Altos', value: summary.highCount, color: 'text-orange-600' },
            { label: 'Médios', value: summary.mediumCount, color: 'text-amber-600' },
            { label: 'Ativos', value: summary.activeCount, color: 'text-plannera-primary' },
          ].map((kpi, i) => (
            <motion.div key={kpi.label} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}>
              <Card className="p-4 bg-surface-card border border-border-divider rounded-2xl text-center">
                <p className="text-[9px] font-black uppercase tracking-widest text-content-secondary mb-1">{kpi.label}</p>
                <p className={cn('text-2xl font-black tracking-tight', kpi.color)}>{kpi.value}</p>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3 p-3 bg-surface-card border border-border-divider rounded-2xl">
        <Filter className="w-4 h-4 text-content-secondary shrink-0" />

        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-36 h-9 text-[10px] font-black uppercase bg-surface-background/50 border-border-divider rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface-card border-border-divider">
            <SelectItem value="active">Ativos</SelectItem>
            <SelectItem value="acknowledged">Reconhecidos</SelectItem>
            <SelectItem value="resolved">Resolvidos</SelectItem>
            <SelectItem value="all">Todos</SelectItem>
          </SelectContent>
        </Select>

        <Select value={severityFilter} onValueChange={setSeverityFilter}>
          <SelectTrigger className="w-36 h-9 text-[10px] font-black uppercase bg-surface-background/50 border-border-divider rounded-xl">
            <SelectValue />
          </SelectTrigger>
          <SelectContent className="bg-surface-card border-border-divider">
            <SelectItem value="all">Todas Severidades</SelectItem>
            <SelectItem value="critical">Crítico</SelectItem>
            <SelectItem value="high">Alto</SelectItem>
            <SelectItem value="medium">Médio</SelectItem>
            <SelectItem value="low">Baixo</SelectItem>
          </SelectContent>
        </Select>

        <Button variant="ghost" size="icon" onClick={load} className="w-9 h-9 rounded-xl border border-border-divider ml-auto">
          <RefreshCw className={cn('w-4 h-4', loading && 'animate-spin')} />
        </Button>
      </div>

      {/* Alerts List */}
      {loading ? (
        <div className="flex items-center justify-center py-20">
          <Loader2 className="w-8 h-8 animate-spin text-plannera-orange" />
        </div>
      ) : alerts.length === 0 ? (
        <div className="flex flex-col items-center py-24 opacity-40">
          <CheckCircle2 className="w-12 h-12 text-emerald-600 mb-4" />
          <p className="text-[11px] font-black uppercase tracking-[0.3em]">Nenhum alerta para os filtros selecionados</p>
        </div>
      ) : (
        <AnimatePresence>
          {alerts.map((alert, idx) => {
            const styles = SEVERITY_STYLES[alert.severity]
            const isActing = acting.has(alert.alertId)
            return (
              <motion.div
                key={alert.alertId}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, x: 20 }}
                transition={{ delay: idx * 0.03 }}
              >
                <Card className={cn(
                  'p-4 border-l-4 border border-border-divider rounded-2xl bg-surface-card transition-all hover:shadow-md',
                  styles.glow
                )}>
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex-1 min-w-0">
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        <Link
                          href={`/accounts/${alert.accountId}`}
                          className="text-[12px] font-black uppercase tracking-tight text-content-primary hover:text-plannera-orange transition-colors"
                        >
                          {alert.accountName}
                        </Link>
                        <Badge className={cn('text-[8px] font-black uppercase border', styles.badge)}>
                          {alert.severity}
                        </Badge>
                        <Badge variant="outline" className="text-[8px] font-black uppercase">
                          {ALERT_TYPE_LABELS[alert.alertType] ?? alert.alertType}
                        </Badge>
                        <span className="text-[9px] text-content-secondary opacity-60">
                          Risk: {Math.round(alert.riskScore * 100)}%
                        </span>
                      </div>

                      <p className="text-[10px] text-content-secondary mb-2">{alert.recommendedAction}</p>

                      {alert.riskFactors.length > 0 && (
                        <div className="flex flex-wrap gap-1.5">
                          {alert.riskFactors.slice(0, 3).map((f, i) => (
                            <span key={i} className="text-[9px] px-2 py-0.5 bg-surface-background border border-border-divider rounded-full text-content-secondary font-bold">
                              {f.factor} ({Math.round(f.weight * 100)}%)
                            </span>
                          ))}
                        </div>
                      )}

                      <p className="text-[8px] text-content-secondary/40 mt-2">
                        {new Date(alert.triggeredAt).toLocaleString('pt-BR')}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {alert.status === 'active' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSnoozeDialog(alert)}
                            className="w-8 h-8 rounded-xl border border-border-divider hover:border-amber-500/40 hover:text-amber-600"
                            title="Pausar alerta"
                          >
                            <BellOff className="w-3.5 h-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleAcknowledge([alert.alertId])}
                            disabled={isActing}
                            className="w-8 h-8 rounded-xl border border-border-divider hover:border-blue-500/40 hover:text-blue-600"
                            title="Reconhecer"
                          >
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Clock className="w-3.5 h-3.5" />}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleResolve([alert.alertId])}
                            disabled={isActing}
                            className="w-8 h-8 rounded-xl border border-border-divider hover:border-emerald-500/40 hover:text-emerald-600"
                            title="Resolver"
                          >
                            {isActing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />}
                          </Button>
                        </>
                      )}
                      <Link href={`/accounts/${alert.accountId}`}>
                        <Button variant="ghost" size="icon" className="w-8 h-8 rounded-xl border border-border-divider">
                          <ChevronRight className="w-3.5 h-3.5" />
                        </Button>
                      </Link>
                    </div>
                  </div>
                </Card>
              </motion.div>
            )
          })}
        </AnimatePresence>
      )}

      {/* Snooze Dialog */}
      <Dialog open={!!snoozeDialog} onOpenChange={open => !open && setSnoozeDialog(null)}>
        <DialogContent className="bg-surface-card border border-border-divider max-w-sm rounded-2xl shadow-2xl">
          <DialogHeader className="pb-4 border-b border-border-divider">
            <DialogTitle className="flex items-center gap-2 text-sm font-black uppercase tracking-tight">
              <BellOff className="w-4 h-4 text-amber-600" />
              Pausar Alerta
            </DialogTitle>
            {snoozeDialog && (
              <p className="text-[10px] text-content-secondary mt-1">
                {snoozeDialog.accountName} — {ALERT_TYPE_LABELS[snoozeDialog.alertType]}
              </p>
            )}
          </DialogHeader>
          <div className="py-4 grid grid-cols-2 gap-3">
            {SNOOZE_OPTIONS.map(opt => (
              <Button
                key={opt.hours}
                variant="outline"
                onClick={() => handleSnooze(opt.hours)}
                disabled={snoozing}
                className="h-12 text-[10px] font-black uppercase tracking-widest border-border-divider hover:border-amber-500/40 hover:bg-amber-500/5 hover:text-amber-600 rounded-xl"
              >
                {snoozing ? <Loader2 className="w-4 h-4 animate-spin" /> : opt.label}
              </Button>
            ))}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
