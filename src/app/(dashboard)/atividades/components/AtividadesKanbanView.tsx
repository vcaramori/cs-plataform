'use client'

import { useMemo } from 'react'
import { TaskCard } from './TaskCard'
import type { CsmTask, CsmTaskStatus } from '@/lib/supabase/types'
import { cn } from '@/lib/utils'

interface Props {
  tasks: CsmTask[]
  onEdit: (task: CsmTask) => void
  onStatusChange: (id: string, status: CsmTaskStatus) => void
  onDelete: (id: string) => void
}

type Column = {
  status: CsmTaskStatus
  label: string
  colorClass: string
  bgClass: string
}

const COLUMNS: Column[] = [
  { status: 'suggested',   label: 'Sugestão',      colorClass: 'text-accent',            bgClass: 'bg-accent/5 border-accent/20' },
  { status: 'todo',        label: 'A Fazer',        colorClass: 'text-content-primary',   bgClass: 'bg-surface-card border-border-divider' },
  { status: 'in_progress', label: 'Em Andamento',   colorClass: 'text-amber-500',         bgClass: 'bg-amber-500/5 border-amber-500/20' },
  { status: 'completed',   label: 'Concluído',      colorClass: 'text-success',           bgClass: 'bg-success/5 border-success/20' },
  { status: 'cancelled',   label: 'Cancelado',      colorClass: 'text-content-secondary', bgClass: 'bg-muted/30 border-border-divider' },
]

export function AtividadesKanbanView({ tasks, onEdit, onStatusChange, onDelete }: Props) {
  const byStatus = useMemo(() => {
    const map: Record<CsmTaskStatus, CsmTask[]> = {
      suggested: [], todo: [], in_progress: [], completed: [], cancelled: [],
    }
    tasks.forEach(t => { map[t.status]?.push(t) })
    return map
  }, [tasks])

  return (
    <div className="flex gap-4 overflow-x-auto pb-4 min-h-[500px]">
      {COLUMNS.map(col => (
        <div
          key={col.status}
          className={cn(
            'flex-shrink-0 w-[280px] rounded-2xl border p-3 flex flex-col gap-3',
            col.bgClass
          )}
        >
          {/* Cabeçalho da coluna */}
          <div className="flex items-center justify-between px-1">
            <h3 className={cn('text-[10px] font-black uppercase tracking-[0.15em]', col.colorClass)}>
              {col.label}
            </h3>
            <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full bg-background/40', col.colorClass)}>
              {byStatus[col.status].length}
            </span>
          </div>

          {/* Cards */}
          <div className="flex flex-col gap-2 flex-1">
            {byStatus[col.status].length === 0 ? (
              <div className="flex-1 flex items-center justify-center text-[10px] text-content-secondary/40 font-semibold py-8 text-center">
                Nenhuma tarefa
              </div>
            ) : (
              byStatus[col.status].map(task => (
                <TaskCard
                  key={task.id}
                  task={task}
                  onEdit={onEdit}
                  onStatusChange={onStatusChange}
                  onDelete={onDelete}
                />
              ))
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
