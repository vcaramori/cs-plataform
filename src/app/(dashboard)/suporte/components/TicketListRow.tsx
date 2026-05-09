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
      <TableCell className="font-medium whitespace-nowrap">
        {ticket.accounts?.name || 'N/A'}
      </TableCell>
      <TableCell className="max-w-[300px]">
        <div className="flex flex-col">
          <span className="font-semibold text-content-primary line-clamp-1">{ticket.title}</span>
          <span className="text-xs text-muted-foreground line-clamp-1">{ticket.description}</span>
        </div>
      </TableCell>
      <TableCell>
        <StatusBadgeGuard 
          type={ticket.status as keyof typeof statusConfig} 
          label={statusConfig[ticket.status]?.label || ticket.status} 
        />

      </TableCell>
      <TableCell>
        <UrgencyBadge score={ticket.urgency_score} reasoning={ticket.urgency_reasoning} />
      </TableCell>
      <TableCell>
        <Badge variant="outline" className={cn(priorityConfig[ticket.priority]?.bg, priorityConfig[ticket.priority]?.color, "border-none shadow-none font-bold")}>
          {priorityConfig[ticket.priority]?.label}
        </Badge>
      </TableCell>
      <TableCell>
        <div className="flex flex-col gap-1">
          <SLABadge status={ticket.sla_status_first_response} label="Resposta" />
          <SLABadge status={ticket.sla_status_resolution} label="Resolução" />
        </div>
      </TableCell>
      <TableCell className="text-muted-foreground whitespace-nowrap text-xs">
        {formatDate(new Date(ticket.opened_at), 'dd/MM/yyyy', { locale: ptBR })}
      </TableCell>
    </TableRow>
  )
}
