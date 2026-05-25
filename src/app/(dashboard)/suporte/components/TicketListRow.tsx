'use client'

import React from 'react'
import { TableCell, TableRow } from '@/components/ui/table'
import { Checkbox } from '@/components/ui/checkbox'
import { Badge } from '@/components/ui/badge'
import { SLABadge } from '@/components/support/SLABadge'
import { StatusBadgeGuard } from '@/components/shared/guardians/StatusBadgeGuard'
import { UrgencyBadge } from './UrgencyBadge'
import { format as formatDate } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { SupportTicket, Account } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface TicketListRowProps {
  ticket: SupportTicket & { accounts?: Pick<Account, 'id' | 'name'> | null }
  isSelected: boolean
  onSelect: (id: string, checked: boolean) => void
  onPreview: (id: string) => void
  isHighlighted?: boolean
}

const statusConfig: Record<string, { label: string, color: string, bg: string }> = {
  open: { label: 'Aberto', color: 'text-destructive', bg: 'bg-destructive/10' },
  'in_progress': { label: 'Em Progresso', color: 'text-accent', bg: 'bg-accent/10' },
  resolved: { label: 'Resolvido', color: 'text-success', bg: 'bg-success/10' },
  closed: { label: 'Fechado', color: 'text-content-secondary', bg: 'bg-surface-background/50' },
  reopened: { label: 'Reaberto', color: 'text-accent', bg: 'bg-accent/10' },
}

const priorityConfig: Record<string, { label: string, color: string, bg: string }> = {
  critical: { label: 'Crítico', color: 'text-destructive', bg: 'bg-destructive/10' },
  high: { label: 'Alto', color: 'text-accent', bg: 'bg-accent/10' },
  medium: { label: 'Médio', color: 'text-secondary', bg: 'bg-secondary/10' },
  low: { label: 'Baixo', color: 'text-content-secondary', bg: 'bg-surface-background/50' },
}

export const TicketListRow: React.FC<TicketListRowProps> = ({
  ticket,
  isSelected,
  onSelect,
  onPreview,
  isHighlighted = false
}) => {
  return (
    <TableRow 
      key={ticket.id} 
      className={cn(
        "cursor-pointer transition-colors hover:bg-surface-background/60",
        isHighlighted && "bg-accent/5 hover:bg-accent/10 border-l-4 border-l-accent"
      )}
      onClick={() => onPreview(ticket.id)}
    >
      <TableCell className="w-10" onClick={(e) => e.stopPropagation()}>
        <Checkbox 
          checked={isSelected} 
          onCheckedChange={(checked) => onSelect(ticket.id, !!checked)} 
        />
      </TableCell>
      <TableCell className="text-xs font-semibold whitespace-nowrap">
        {ticket.accounts?.name || 'N/A'}
      </TableCell>
      <TableCell className="max-w-[300px] py-2">
        <div className="flex flex-col gap-0.5">
          <span className="text-xs font-bold text-content-primary line-clamp-1">{ticket.title}</span>
          <span className="text-[11px] text-muted-foreground line-clamp-1">{ticket.description}</span>
        </div>
      </TableCell>
      <TableCell className="py-2">
        <StatusBadgeGuard 
          type={ticket.status as any}
          label={statusConfig[ticket.status]?.label || ticket.status} 
          size="sm"
        />
      </TableCell>
      <TableCell className="py-2 text-center">
        <UrgencyBadge score={ticket.urgency_score} reasoning={ticket.urgency_reasoning} className="text-[9px] font-bold px-2 py-0.5 rounded-md" />
      </TableCell>
      <TableCell className="py-2 text-center">
        <Badge variant="outline" className={cn(priorityConfig[ticket.priority]?.bg, priorityConfig[ticket.priority]?.color, "border-none shadow-none text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-md")}>
          {priorityConfig[ticket.priority]?.label}
        </Badge>
      </TableCell>
      <TableCell className="py-2">
        <div className="flex flex-col gap-1 items-center">
          <SLABadge status={ticket.sla_status_first_response} label="Resposta" />
          <SLABadge status={ticket.sla_status_resolution} label="Resolução" />
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap text-[11px] text-right">
        {formatDate(new Date(ticket.opened_at), 'dd/MM/yyyy', { locale: ptBR })}
      </TableCell>
    </TableRow>
  )
}
