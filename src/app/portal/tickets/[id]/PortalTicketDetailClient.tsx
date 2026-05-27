'use client'

import Link from 'next/link'
import { ArrowLeft, Clock, CheckCircle2, AlertTriangle, Circle, ShieldCheck, ShieldX } from 'lucide-react'
import { cn } from '@/lib/utils'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  open:         { label: 'Aberto',       color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-500/10',    icon: Circle },
  in_progress:  { label: 'Em Andamento', color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-500/10',      icon: Clock },
  'in-progress':{ label: 'Em Andamento', color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-500/10',      icon: Clock },
  waiting:      { label: 'Aguardando',   color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-500/10',  icon: Clock },
  escalated:    { label: 'Escalado',     color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-500/10',        icon: AlertTriangle },
  resolved:     { label: 'Resolvido',    color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10',icon: CheckCircle2 },
  closed:       { label: 'Encerrado',    color: 'text-slate-500',   bg: 'bg-slate-50 dark:bg-slate-500/10',    icon: CheckCircle2 },
}

const EVENT_LABELS: Record<string, string> = {
  opened:           'Chamado aberto',
  assigned:         'Atribuído à equipe',
  first_response:   'Primeira resposta enviada',
  status_changed:   'Status atualizado',
  escalation:       'Escalado para suporte sênior',
  breach:           'SLA violado',
  resolved:         'Chamado resolvido',
  closed:           'Chamado encerrado',
  reopened:         'Chamado reaberto',
}

function formatDate(iso: string | null) {
  if (!iso) return '—'
  return format(new Date(iso), "dd 'de' MMM 'de' yyyy 'às' HH:mm", { locale: ptBR })
}

function InfoRow({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4 py-3 border-b border-border-divider last:border-0">
      <span className="text-[10px] font-black uppercase tracking-widest text-content-secondary shrink-0">{label}</span>
      <span className="text-sm font-bold text-foreground text-right">{value ?? '—'}</span>
    </div>
  )
}

export function PortalTicketDetailClient({ ticket }: { ticket: any }) {
  const status = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open
  const StatusIcon = status.icon
  const ticketRef = ticket.external_ticket_id ?? `#${ticket.id.slice(0, 8).toUpperCase()}`
  const priorityLabel = ticket.external_priority_label ?? ticket.priority

  const slaFirstResponse = !ticket.sla_breach_first_response
  const slaResolution = !ticket.sla_breach_resolution
  const isResolved = ['resolved', 'closed'].includes(ticket.status)

  const events: any[] = (ticket.sla_events ?? [])
    .filter((e: any) => e.event_type !== 'breach' || true) // mostra todos
    .sort((a: any, b: any) => new Date(a.occurred_at).getTime() - new Date(b.occurred_at).getTime())

  // Adiciona evento sintético de abertura
  const timeline = [
    { event_type: 'opened', occurred_at: ticket.opened_at },
    ...events,
    ...(isResolved && ticket.resolved_at
      ? [{ event_type: ticket.status === 'closed' ? 'closed' : 'resolved', occurred_at: ticket.resolved_at }]
      : []),
  ]

  return (
    <div className="space-y-6">
      {/* Voltar */}
      <Link href="/portal/tickets" className="inline-flex items-center gap-2 text-xs font-bold text-content-secondary hover:text-foreground transition-colors uppercase tracking-widest">
        <ArrowLeft className="w-3.5 h-3.5" />
        Voltar aos chamados
      </Link>

      {/* Header do ticket */}
      <div className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl p-6 shadow-sm space-y-4">
        <div className="flex items-start gap-4">
          <div className={cn('w-11 h-11 rounded-xl flex items-center justify-center shrink-0 mt-0.5', status.bg)}>
            <StatusIcon className={cn('w-5 h-5', status.color)} />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-1">
              <span className="text-[10px] font-black text-content-secondary uppercase tracking-widest">{ticketRef}</span>
              <span className={cn('px-2 py-0.5 rounded-full text-[9px] font-black uppercase tracking-wide', status.bg, status.color)}>
                {status.label}
              </span>
            </div>
            <h1 className="text-lg font-black text-foreground leading-tight">{ticket.title}</h1>
          </div>
        </div>

        {ticket.description && (
          <p className="text-sm text-content-secondary leading-relaxed border-t border-border-divider pt-4">
            {ticket.description}
          </p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Detalhes */}
        <div className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-3">Detalhes</p>
          <InfoRow label="Prioridade" value={<span className="capitalize">{priorityLabel}</span>} />
          <InfoRow label="Abertura" value={formatDate(ticket.opened_at)} />
          {ticket.first_response_at && <InfoRow label="1ª Resposta" value={formatDate(ticket.first_response_at)} />}
          {isResolved && <InfoRow label="Resolução" value={formatDate(ticket.resolved_at)} />}
          {ticket.category && <InfoRow label="Categoria" value={ticket.category} />}
        </div>

        {/* SLA */}
        <div className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-3">SLA</p>
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-content-secondary">Primeira Resposta</span>
              <div className={cn('flex items-center gap-1.5 text-xs font-black', slaFirstResponse ? 'text-emerald-600' : 'text-red-500')}>
                {slaFirstResponse ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                {slaFirstResponse ? 'Cumprido' : 'Violado'}
              </div>
            </div>
            {ticket.first_response_deadline && (
              <p className="text-[10px] text-content-secondary">Prazo: {formatDate(ticket.first_response_deadline)}</p>
            )}
            <div className="border-t border-border-divider pt-3 flex items-center justify-between">
              <span className="text-xs font-bold text-content-secondary">Resolução</span>
              <div className={cn('flex items-center gap-1.5 text-xs font-black', slaResolution ? 'text-emerald-600' : 'text-red-500')}>
                {slaResolution ? <ShieldCheck className="w-4 h-4" /> : <ShieldX className="w-4 h-4" />}
                {slaResolution
                  ? isResolved ? 'Cumprido' : 'Dentro do prazo'
                  : 'Violado'}
              </div>
            </div>
            {ticket.resolution_deadline && (
              <p className="text-[10px] text-content-secondary">Prazo: {formatDate(ticket.resolution_deadline)}</p>
            )}
          </div>
        </div>
      </div>

      {/* Timeline */}
      {timeline.length > 0 && (
        <div className="bg-white dark:bg-slate-900 border border-border-divider rounded-2xl p-6 shadow-sm">
          <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-6">Histórico</p>
          <div className="relative space-y-0">
            {timeline.map((event, idx) => {
              const label = EVENT_LABELS[event.event_type] ?? event.event_type
              const isBreach = event.event_type === 'breach'
              const isLast = idx === timeline.length - 1
              return (
                <div key={idx} className="flex gap-4 relative">
                  {/* Linha vertical */}
                  {!isLast && (
                    <div className="absolute left-[17px] top-8 bottom-0 w-px bg-border-divider" />
                  )}
                  {/* Dot */}
                  <div className={cn(
                    'w-9 h-9 rounded-full flex items-center justify-center shrink-0 z-10 border-2',
                    isBreach
                      ? 'bg-red-500/10 border-red-500/30'
                      : isLast
                        ? 'bg-plannera-orange/10 border-plannera-orange/30'
                        : 'bg-surface-background border-border-divider'
                  )}>
                    {isBreach
                      ? <AlertTriangle className="w-3.5 h-3.5 text-red-500" />
                      : isLast
                        ? <CheckCircle2 className="w-3.5 h-3.5 text-plannera-orange" />
                        : <Circle className="w-3 h-3 text-content-secondary" />
                    }
                  </div>
                  {/* Conteúdo */}
                  <div className="flex-1 pb-6">
                    <p className={cn('text-sm font-bold', isBreach ? 'text-red-500' : 'text-foreground')}>{label}</p>
                    <p className="text-[10px] text-content-secondary mt-0.5">{formatDate(event.occurred_at)}</p>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
