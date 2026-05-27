'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { Search, ChevronRight, Clock, CheckCircle2, AlertTriangle, Circle } from 'lucide-react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { formatDistanceToNow } from 'date-fns'
import { ptBR } from 'date-fns/locale'

interface Ticket {
  id: string
  title: string
  status: string
  priority: string
  external_priority_label: string | null
  external_ticket_id: string | null
  opened_at: string
  resolved_at: string | null
  sla_breach_first_response: boolean
  sla_breach_resolution: boolean
  category: string | null
}

const STATUS_CONFIG: Record<string, { label: string; color: string; bg: string; icon: any }> = {
  open:        { label: 'Aberto',       color: 'text-amber-600',   bg: 'bg-amber-50 dark:bg-amber-500/10',    icon: Circle },
  in_progress: { label: 'Em Andamento', color: 'text-blue-600',    bg: 'bg-blue-50 dark:bg-blue-500/10',      icon: Clock },
  'in-progress':{ label: 'Em Andamento', color: 'text-blue-600',   bg: 'bg-blue-50 dark:bg-blue-500/10',      icon: Clock },
  waiting:     { label: 'Aguardando',   color: 'text-purple-600',  bg: 'bg-purple-50 dark:bg-purple-500/10',  icon: Clock },
  escalated:   { label: 'Escalado',     color: 'text-red-600',     bg: 'bg-red-50 dark:bg-red-500/10',        icon: AlertTriangle },
  resolved:    { label: 'Resolvido',    color: 'text-emerald-600', bg: 'bg-emerald-50 dark:bg-emerald-500/10',icon: CheckCircle2 },
  closed:      { label: 'Encerrado',    color: 'text-slate-500',   bg: 'bg-slate-50 dark:bg-slate-500/10',    icon: CheckCircle2 },
}

const PRIORITY_CONFIG: Record<string, { label: string; dot: string }> = {
  critical: { label: 'Crítico',  dot: 'bg-red-500' },
  high:     { label: 'Alto',     dot: 'bg-orange-500' },
  medium:   { label: 'Médio',    dot: 'bg-amber-400' },
  low:      { label: 'Baixo',    dot: 'bg-slate-400' },
}

const STATUS_FILTERS = [
  { value: 'all',    label: 'Todos' },
  { value: 'open',   label: 'Abertos' },
  { value: 'closed', label: 'Resolvidos' },
]

export function PortalTicketsClient({ tickets, accountName }: { tickets: Ticket[]; accountName: string }) {
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  const filtered = useMemo(() => {
    return tickets.filter(t => {
      const matchSearch = !search || t.title.toLowerCase().includes(search.toLowerCase()) ||
        (t.external_ticket_id ?? '').toLowerCase().includes(search.toLowerCase())
      const isResolved = ['resolved', 'closed'].includes(t.status)
      const matchStatus =
        statusFilter === 'all' ||
        (statusFilter === 'open' && !isResolved) ||
        (statusFilter === 'closed' && isResolved)
      return matchSearch && matchStatus
    })
  }, [tickets, search, statusFilter])

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black uppercase tracking-tight text-foreground">Chamados</h1>
        <p className="text-sm text-content-secondary mt-1">{accountName} · {tickets.length} total</p>
      </div>

      {/* Filtros */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-content-secondary" />
          <Input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Buscar por título ou número..."
            className="pl-9 h-10 rounded-xl"
          />
        </div>
        <div className="flex gap-1 bg-white dark:bg-slate-900 border border-border-divider rounded-xl p-1">
          {STATUS_FILTERS.map(f => (
            <button
              key={f.value}
              onClick={() => setStatusFilter(f.value)}
              className={cn(
                'px-3 py-1.5 rounded-lg text-[10px] font-black uppercase tracking-widest transition-all',
                statusFilter === f.value
                  ? 'bg-plannera-orange text-white'
                  : 'text-content-secondary hover:text-foreground'
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {/* Lista */}
      {filtered.length === 0 ? (
        <div className="py-20 text-center border border-dashed border-border-divider rounded-2xl">
          <p className="text-content-secondary text-sm font-bold">Nenhum chamado encontrado</p>
        </div>
      ) : (
        <div className="space-y-2">
          {filtered.map(ticket => {
            const status = STATUS_CONFIG[ticket.status] ?? STATUS_CONFIG.open
            const StatusIcon = status.icon
            const priority = PRIORITY_CONFIG[ticket.priority] ?? PRIORITY_CONFIG.medium
            const priorityLabel = ticket.external_priority_label ?? priority.label
            const ticketRef = ticket.external_ticket_id ?? `#${ticket.id.slice(0, 8).toUpperCase()}`
            const hasBreach = ticket.sla_breach_first_response || ticket.sla_breach_resolution
            const isResolved = ['resolved', 'closed'].includes(ticket.status)

            return (
              <Link
                key={ticket.id}
                href={`/portal/tickets/${ticket.id}`}
                className="group flex items-center gap-4 bg-white dark:bg-slate-900 border border-border-divider hover:border-plannera-orange/30 hover:shadow-md rounded-2xl p-4 transition-all"
              >
                {/* Status icon */}
                <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center shrink-0', status.bg)}>
                  <StatusIcon className={cn('w-4 h-4', status.color)} />
                </div>

                {/* Main info */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[10px] font-black text-content-secondary uppercase tracking-widest">{ticketRef}</span>
                    {hasBreach && !isResolved && (
                      <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-red-500/10 text-red-500 text-[9px] font-black uppercase tracking-wide">
                        <AlertTriangle className="w-2.5 h-2.5" />SLA
                      </span>
                    )}
                  </div>
                  <p className="text-sm font-bold text-foreground truncate mt-0.5 group-hover:text-plannera-orange transition-colors">
                    {ticket.title}
                  </p>
                  <div className="flex items-center gap-3 mt-1 flex-wrap">
                    <span className={cn('text-[9px] font-black uppercase tracking-wide px-2 py-0.5 rounded-full', status.bg, status.color)}>
                      {status.label}
                    </span>
                    <span className="flex items-center gap-1 text-[10px] text-content-secondary font-bold">
                      <span className={cn('w-1.5 h-1.5 rounded-full', priority.dot)} />
                      {priorityLabel}
                    </span>
                    <span className="text-[10px] text-content-secondary">
                      {formatDistanceToNow(new Date(ticket.opened_at), { addSuffix: true, locale: ptBR })}
                    </span>
                  </div>
                </div>

                <ChevronRight className="w-4 h-4 text-content-secondary group-hover:text-plannera-orange transition-colors shrink-0" />
              </Link>
            )
          })}
        </div>
      )}
    </div>
  )
}
