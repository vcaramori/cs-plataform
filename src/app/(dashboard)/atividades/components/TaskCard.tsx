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

/** Cor de acento (barra lateral + caixa do ícone + glow) conforme estado/prioridade. */
function accentFor(task: CsmTask, isOverdue: boolean): { bar: string; iconBg: string; iconText: string; glow: string } {
  if (task.status === 'completed') return { bar: 'bg-success', iconBg: 'bg-success/10 border-success/20', iconText: 'text-success', glow: 'bg-success/20' }
  if (task.status === 'cancelled') return { bar: 'bg-slate-400', iconBg: 'bg-slate-400/10 border-slate-400/20', iconText: 'text-slate-400', glow: 'bg-slate-400/10' }
  if (isOverdue || task.priority === 'high') return { bar: 'bg-red-500', iconBg: 'bg-red-500/10 border-red-500/20', iconText: 'text-red-500', glow: 'bg-red-500/20' }
  if (task.priority === 'medium') return { bar: 'bg-amber-500', iconBg: 'bg-amber-500/10 border-amber-500/20', iconText: 'text-amber-500', glow: 'bg-amber-500/20' }
  return { bar: 'bg-slate-400', iconBg: 'bg-slate-400/10 border-slate-400/20', iconText: 'text-content-secondary', glow: 'bg-slate-400/10' }
}

export function TaskCard({ task, onEdit, onStatusChange, onDelete, onOpenDetail, isDragging }: TaskCardProps) {
  const StatusIcon = statusIcon[task.status] ?? Clock
  const priority = priorityConfig[task.priority]

  const isOverdue = !!task.due_date
    && task.status !== 'completed'
    && task.status !== 'cancelled'
    && new Date(task.due_date + 'T00:00:00') < new Date()

  const accent = accentFor(task, isOverdue)

  return (
    <div
      className={cn(
        'group relative overflow-hidden rounded-2xl bg-surface-card border border-border-divider shadow-premium',
        'transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg cursor-pointer',
        isDragging && 'opacity-50 rotate-1 shadow-xl',
        isOverdue ? 'hover:border-red-500/40' : 'hover:border-accent/40'
      )}
      onClick={() => onOpenDetail?.(task)}
    >
      {/* Barra de acento + glow */}
      <div className={cn('absolute left-0 top-0 bottom-0 w-1', accent.bar)} />
      <div className={cn('absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none', accent.glow)} />

      <div className="relative p-4 pl-5 space-y-3">
        {/* Cabeçalho */}
        <div className="flex items-start justify-between gap-2">
          <div className="flex items-start gap-3 min-w-0">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105', accent.iconBg)}>
              <StatusIcon className={cn('w-4 h-4', accent.iconText)} />
            </div>
            <p className={cn(
              'text-sm font-bold text-content-primary leading-snug mt-0.5',
              task.status === 'completed' && 'line-through opacity-60'
            )}>
              {task.title}
            </p>
          </div>

          <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity flex-shrink-0">
            <Button variant="ghost" size="icon" className="w-6 h-6 rounded-lg" onClick={e => { e.stopPropagation(); onEdit(task) }}>
              <Pencil className="w-3 h-3" />
            </Button>
            <Button variant="ghost" size="icon" className="w-6 h-6 rounded-lg text-destructive hover:text-destructive" onClick={e => { e.stopPropagation(); onDelete(task.id) }}>
              <Trash2 className="w-3 h-3" />
            </Button>
          </div>
        </div>

        {/* Descrição (prévia) */}
        {task.description && (
          <p className="text-xs text-content-secondary line-clamp-2 leading-snug pl-11">{task.description}</p>
        )}

        {/* Meta: conta, prioridade, origem, prazo */}
        <div className="flex items-center gap-2 flex-wrap pl-11">
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
          {task.due_date && (
            <span className={cn(
              'flex items-center gap-1 text-[10px] font-semibold ml-auto',
              isOverdue ? 'text-destructive' : 'text-content-secondary'
            )}>
              <Calendar className="w-3 h-3" />
              {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
              {isOverdue && <span className="font-black uppercase">— Atrasada</span>}
            </span>
          )}
        </div>
      </div>
    </div>
  )
}
