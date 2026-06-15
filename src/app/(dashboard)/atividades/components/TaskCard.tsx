'use client'

import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { cn } from '@/lib/utils'
import { Calendar, Building2, AlertCircle, CheckCircle2, Clock, XCircle, Pencil, Trash2 } from 'lucide-react'
import type { CsmTask, CsmTaskStatus, CsmTaskPriority } from '@/lib/supabase/types'

interface TaskCardProps {
  task: CsmTask
  onEdit: (task: CsmTask) => void
  onStatusChange: (id: string, status: CsmTaskStatus) => void
  onDelete: (id: string) => void
  onOpenDetail?: (task: CsmTask) => void
  isDragging?: boolean
}

const priorityConfig: Record<CsmTaskPriority, { label: string; color: string }> = {
  low:    { label: 'Baixa',  color: 'text-content-secondary' },
  medium: { label: 'Média',  color: 'text-amber-500' },
  high:   { label: 'Alta',   color: 'text-destructive' },
}

const statusIcon: Record<CsmTaskStatus, React.FC<{ className?: string }>> = {
  suggested:   Clock,
  todo:        Clock,
  in_progress: AlertCircle,
  completed:   CheckCircle2,
  cancelled:   XCircle,
}

const sourceLabelMap: Record<string, string> = {
  manual:     'Manual',
  adoption:   'Adoção',
  time_entry: 'Esforço',
  alert:      'Alerta',
  playbook:   'Playbook',
}

export function TaskCard({ task, onEdit, onStatusChange, onDelete, onOpenDetail, isDragging }: TaskCardProps) {
  const StatusIcon = statusIcon[task.status] ?? Clock
  const priority = priorityConfig[task.priority]

  const isOverdue = task.due_date
    && task.status !== 'completed'
    && task.status !== 'cancelled'
    && new Date(task.due_date) < new Date()

  return (
    <div
      className={cn(
        'group relative bg-surface-card border border-border-divider rounded-2xl p-4 space-y-3',
        'hover:border-accent/40 hover:shadow-md transition-all cursor-pointer',
        isDragging && 'opacity-50 rotate-1 shadow-xl',
        isOverdue && 'border-destructive/30'
      )}
      onClick={() => onOpenDetail?.(task)}
    >
      {/* Cabeçalho */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <StatusIcon className={cn(
            'w-4 h-4 flex-shrink-0',
            task.status === 'completed' ? 'text-success' :
            task.status === 'cancelled' ? 'text-content-secondary' :
            isOverdue ? 'text-destructive' : 'text-content-secondary'
          )} />
          <p className={cn(
            'text-sm font-semibold text-content-primary leading-tight',
            task.status === 'completed' && 'line-through opacity-60'
          )}>
            {task.title}
          </p>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 rounded-lg"
            onClick={e => { e.stopPropagation(); onEdit(task) }}
          >
            <Pencil className="w-3 h-3" />
          </Button>
          <Button
            variant="ghost"
            size="icon"
            className="w-6 h-6 rounded-lg text-destructive hover:text-destructive"
            onClick={e => { e.stopPropagation(); onDelete(task.id) }}
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      </div>

      {/* Descrição (prévia) */}
      {task.description && (
        <p className="text-xs text-content-secondary line-clamp-2 leading-snug">{task.description}</p>
      )}

      {/* Conta e prioridade */}
      <div className="flex items-center gap-2 flex-wrap">
        {task.accounts?.name && (
          <span className="flex items-center gap-1 text-[10px] font-semibold text-content-secondary bg-muted/50 px-2 py-0.5 rounded-full">
            <Building2 className="w-3 h-3" />
            {task.accounts.name}
          </span>
        )}
        <Badge variant="neutral" className={cn('text-[9px] font-black uppercase px-2 py-0.5', priority.color)}>
          {priority.label}
        </Badge>
        {task.source_label && task.source_label !== 'manual' && (
          <Badge variant="neutral" className="text-[9px] font-black uppercase px-2 py-0.5 text-accent border-accent/30">
            {sourceLabelMap[task.source_label] ?? task.source_label}
          </Badge>
        )}
      </div>

      {/* Data de entrega */}
      {task.due_date && (
        <div className={cn(
          'flex items-center gap-1.5 text-[10px] font-semibold',
          isOverdue ? 'text-destructive' : 'text-content-secondary'
        )}>
          <Calendar className="w-3 h-3" />
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
          {isOverdue && <span className="font-black uppercase">— Atrasada</span>}
        </div>
      )}
    </div>
  )
}
