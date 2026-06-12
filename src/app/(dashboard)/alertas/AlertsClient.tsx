'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import {
  AlertTriangle, Loader2, RefreshCw, CheckCheck, Check, Circle, Dot,
  ExternalLink, MailOpen, Mail, Sparkles,
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'

const TYPE_LABELS: Record<string, string> = {
  churn_risk: 'Risco de Churn',
  silent_customer: 'Cliente Silencioso',
  renewal_upcoming: 'Renovação Próxima',
  adoption_anomaly: 'Anomalia de Adoção',
  expansion_signal: 'Sinal de Expansão',
  nps_detractor_unactioned: 'Detrator sem Ação',
  playbook_trigger: 'Gatilho de Playbook',
  sla_breach: 'SLA em Risco',
  new_ticket: 'Novo Chamado',
  mention: 'Menção',
  discrepancy: 'Discrepância',
  stale_score: 'Score Desatualizado',
}

const SEV_STYLES: Record<string, string> = {
  critical: 'border-l-red-500 text-red-500',
  warning: 'border-l-amber-500 text-amber-500',
  info: 'border-l-blue-500 text-blue-500',
}

interface Alert {
  id: string
  account_id: string
  type: string
  severity: 'critical' | 'warning' | 'info'
  message: string
  metadata: any
  resolved_at: string | null
  created_at: string
  account_name: string
  owner_id: string | null
  owner_name: string | null
  treatment: 'pendente' | 'tratado'
  linked_entity: { type: string | null; label: string; status: string | null; href: string | null } | null
  read: boolean
}

type StatusFilter = 'active' | 'resolved' | 'all'

export function AlertsClient() {
  const [alerts, setAlerts] = useState<Alert[]>([])
  const [loading, setLoading] = useState(true)
  const [evaluating, setEvaluating] = useState(false)
  const [scope, setScope] = useState<string>('own')
  const [status, setStatus] = useState<StatusFilter>('active')
  const [onlyUnread, setOnlyUnread] = useState(false)
  const [treatment, setTreatment] = useState<'all' | 'pendente' | 'tratado'>('all')

  const fetchAlerts = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/alerts?status=${status}`)
      const data = await res.json()
      setAlerts(data.alerts ?? [])
      setScope(data.scope ?? 'own')
    } catch {
      toast.error('Falha ao carregar alertas')
    } finally {
      setLoading(false)
    }
  }, [status])

  useEffect(() => { fetchAlerts() }, [fetchAlerts])

  const setRead = async (ids: string[], read: boolean) => {
    setAlerts(prev => prev.map(a => (ids.includes(a.id) ? { ...a, read } : a)))
    try {
      await fetch('/api/alerts/read', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ alert_ids: ids, read }),
      })
    } catch {
      toast.error('Falha ao atualizar leitura')
      fetchAlerts()
    }
  }

  const markAllRead = () => {
    const unreadIds = alerts.filter(a => !a.read).map(a => a.id)
    if (unreadIds.length) setRead(unreadIds, true)
  }

  const resolve = async (id: string) => {
    setAlerts(prev => prev.map(a => (a.id === id ? { ...a, resolved_at: new Date().toISOString(), treatment: 'tratado' } : a)))
    try {
      const res = await fetch(`/api/proactive-alerts/${id}/resolve`, { method: 'PATCH' })
      if (!res.ok) throw new Error()
      toast.success('Alerta resolvido')
      if (status === 'active') setAlerts(prev => prev.filter(a => a.id !== id))
    } catch {
      toast.error('Falha ao resolver')
      fetchAlerts()
    }
  }

  const evaluateNow = async () => {
    setEvaluating(true)
    try {
      const res = await fetch('/api/alerts/evaluate', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error()
      toast.success(`Avaliação concluída — ${data.created ?? 0} novo(s) alerta(s)`)
      await fetchAlerts()
    } catch {
      toast.error('Falha ao avaliar alertas')
    } finally {
      setEvaluating(false)
    }
  }

  const visible = alerts
    .filter(a => (onlyUnread ? !a.read : true))
    .filter(a => (treatment === 'all' ? true : a.treatment === treatment))

  const unreadCount = alerts.filter(a => !a.read).length

  return (
    <div className="space-y-5">
      {/* Barra de ações + filtros */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex rounded-xl border border-border-divider overflow-hidden">
          {([['active', 'Ativos'], ['resolved', 'Resolvidos'], ['all', 'Todos']] as [StatusFilter, string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setStatus(val)}
              className={cn(
                'px-4 h-9 text-[10px] font-black uppercase tracking-widest transition-colors',
                status === val ? 'bg-primary text-primary-foreground' : 'bg-surface-card text-content-secondary hover:text-content-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <div className="flex rounded-xl border border-border-divider overflow-hidden">
          {([['all', 'Tratamento'], ['pendente', 'Pendente'], ['tratado', 'Tratado']] as ['all' | 'pendente' | 'tratado', string][]).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setTreatment(val)}
              className={cn(
                'px-3 h-9 text-[10px] font-black uppercase tracking-widest transition-colors',
                treatment === val ? 'bg-accent text-accent-foreground' : 'bg-surface-card text-content-secondary hover:text-content-primary'
              )}
            >
              {label}
            </button>
          ))}
        </div>

        <button
          onClick={() => setOnlyUnread(o => !o)}
          className={cn(
            'px-3 h-9 rounded-xl border text-[10px] font-black uppercase tracking-widest transition-colors',
            onlyUnread ? 'bg-primary text-primary-foreground border-primary' : 'bg-surface-card text-content-secondary border-border-divider hover:text-content-primary'
          )}
        >
          Só não-lidos {unreadCount > 0 && `(${unreadCount})`}
        </button>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={markAllRead} disabled={unreadCount === 0} className="gap-2 text-[10px] font-black uppercase tracking-widest">
            <CheckCheck className="w-4 h-4" /> Marcar todas lidas
          </Button>
          <Button size="sm" onClick={evaluateNow} disabled={evaluating} className="gap-2 text-[10px] font-black uppercase tracking-widest">
            {evaluating ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />} Avaliar agora
          </Button>
        </div>
      </div>

      {scope === 'global' && (
        <p className="text-[11px] text-content-secondary flex items-center gap-1.5">
          <Sparkles className="w-3.5 h-3.5 text-accent" /> Visão global: você está vendo os alertas de todas as contas e seus responsáveis.
        </p>
      )}

      {/* Lista */}
      {loading ? (
        <div className="flex items-center justify-center py-20 text-content-secondary">
          <Loader2 className="w-7 h-7 animate-spin text-accent" />
        </div>
      ) : visible.length === 0 ? (
        <Card className="p-10 text-center space-y-3 border-border-divider">
          <div className="w-14 h-14 rounded-full bg-muted flex items-center justify-center mx-auto">
            <AlertTriangle className="w-7 h-7 text-content-secondary/40" />
          </div>
          <p className="text-content-primary font-bold text-sm">Nenhum alerta {status === 'active' ? 'ativo' : ''} por aqui.</p>
          <p className="text-content-secondary text-xs">Clique em <strong>Avaliar agora</strong> para gerar o catálogo de alertas a partir dos dados atuais.</p>
        </Card>
      ) : (
        <div className="space-y-2">
          {visible.map(a => (
            <Card
              key={a.id}
              className={cn(
                'p-4 border-l-4 border-border-divider transition-all',
                SEV_STYLES[a.severity]?.split(' ')[0] ?? 'border-l-accent',
                !a.read && 'bg-accent/[0.03]'
              )}
            >
              <div className="flex items-start gap-4">
                <div className="pt-1">
                  {!a.read
                    ? <Circle className="w-2.5 h-2.5 fill-accent text-accent" />
                    : <Dot className="w-2.5 h-2.5 text-content-secondary/30" />}
                </div>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className={cn('text-[10px] font-black uppercase tracking-widest', SEV_STYLES[a.severity]?.split(' ')[1])}>
                      {TYPE_LABELS[a.type] ?? a.type}
                    </span>
                    <Badge variant="outline" className="text-[9px] font-extrabold uppercase">{a.account_name}</Badge>
                    {a.owner_name && scope === 'global' && (
                      <Badge variant="outline" className="text-[9px] uppercase text-content-secondary">CSM: {a.owner_name}</Badge>
                    )}
                    <Badge className={cn(
                      'text-[9px] font-black uppercase border-none',
                      a.treatment === 'tratado' ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400' : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                    )}>
                      {a.treatment === 'tratado' ? 'Tratado' : 'Pendente'}
                    </Badge>
                  </div>

                  <p className="text-sm text-content-primary font-medium">{a.message}</p>

                  {a.linked_entity && (
                    <div className="mt-1.5 flex items-center gap-2 text-[11px] text-content-secondary">
                      <span className="font-bold uppercase tracking-wide">{a.linked_entity.label}:</span>
                      <span>{a.linked_entity.status ?? '—'}</span>
                      {a.linked_entity.href && (
                        <Link href={a.linked_entity.href} className="inline-flex items-center gap-1 text-accent hover:underline">
                          abrir <ExternalLink className="w-3 h-3" />
                        </Link>
                      )}
                    </div>
                  )}
                  {a.metadata?.recommendation && !a.linked_entity && (
                    <p className="mt-1 text-[11px] text-content-secondary italic">→ {a.metadata.recommendation}</p>
                  )}
                </div>

                <div className="flex items-center gap-1 shrink-0">
                  <button
                    onClick={() => setRead([a.id], !a.read)}
                    title={a.read ? 'Marcar como não lida' : 'Marcar como lida'}
                    className="p-2 rounded-lg text-content-secondary hover:text-content-primary hover:bg-muted/60 transition-colors"
                  >
                    {a.read ? <Mail className="w-4 h-4" /> : <MailOpen className="w-4 h-4" />}
                  </button>
                  {!a.resolved_at && (
                    <button
                      onClick={() => resolve(a.id)}
                      title="Resolver alerta"
                      className="p-2 rounded-lg text-content-secondary hover:text-emerald-500 hover:bg-emerald-500/10 transition-colors"
                    >
                      <Check className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  )
}
