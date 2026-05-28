'use client'

import { useMemo, useState, useRef } from 'react'
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
  dropActiveClass: string
}

const COLUMNS: Column[] = [
  {
    status: 'todo',
    label: 'A Fazer',
    colorClass: 'text-content-primary',
    bgClass: 'bg-surface-card border-border-divider',
    dropActiveClass: 'border-content-primary/40 bg-content-primary/5',
  },
  {
    status: 'in_progress',
    label: 'Em Andamento',
    colorClass: 'text-amber-500',
    bgClass: 'bg-amber-500/5 border-amber-500/20',
    dropActiveClass: 'border-amber-400 bg-amber-500/10',
  },
  {
    status: 'completed',
    label: 'Concluído',
    colorClass: 'text-success',
    bgClass: 'bg-success/5 border-success/20',
    dropActiveClass: 'border-success bg-success/10',
  },
  {
    status: 'cancelled',
    label: 'Cancelado',
    colorClass: 'text-content-secondary',
    bgClass: 'bg-muted/30 border-border-divider',
    dropActiveClass: 'border-content-secondary/50 bg-muted/50',
  },
]

export function AtividadesKanbanView({ tasks, onEdit, onStatusChange, onDelete }: Props) {
  const [dragOverCol, setDragOverCol] = useState<CsmTaskStatus | null>(null)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const dragTaskRef = useRef<string | null>(null)

  const byStatus = useMemo(() => {
    const map: Partial<Record<CsmTaskStatus, CsmTask[]>> = {}
    COLUMNS.forEach(c => { map[c.status] = [] })
    tasks.forEach(t => { map[t.status]?.push(t) })
    return map
  }, [tasks])

  function handleDragStart(e: React.DragEvent, taskId: string) {
    dragTaskRef.current = taskId
    setDraggingId(taskId)
    e.dataTransfer.effectAllowed = 'move'
    e.dataTransfer.setData('text/plain', taskId)
  }

  function handleDragEnd() {
    setDraggingId(null)
    setDragOverCol(null)
    dragTaskRef.current = null
  }

  function handleDragOver(e: React.DragEvent, status: CsmTaskStatus) {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
    setDragOverCol(status)
  }

  function handleDragLeave(e: React.DragEvent) {
    // Só limpa se saiu do container da coluna (não de um filho)
    if (!e.currentTarget.contains(e.relatedTarget as Node)) {
      setDragOverCol(null)
    }
  }

  function handleDrop(e: React.DragEvent, targetStatus: CsmTaskStatus) {
    e.preventDefault()
    const taskId = dragTaskRef.current || e.dataTransfer.getData('text/plain')
    if (!taskId) return

    const task = tasks.find(t => t.id === taskId)
    if (task && task.status !== targetStatus) {
      onStatusChange(taskId, targetStatus)
    }

    setDragOverCol(null)
    setDraggingId(null)
    dragTaskRef.current = null
  }

  return (
    <div className="grid grid-cols-4 gap-4 pb-2">
      {COLUMNS.map(col => {
        const colTasks = byStatus[col.status] ?? []
        const isOver = dragOverCol === col.status

        return (
          <div
            key={col.status}
            className={cn(
              'rounded-2xl border-2 p-3 flex flex-col gap-3 transition-colors duration-150',
              isOver ? col.dropActiveClass : col.bgClass.replace('border-', 'border-') ,
              !isOver && col.bgClass
            )}
            onDragOver={e => handleDragOver(e, col.status)}
            onDragLeave={handleDragLeave}
            onDrop={e => handleDrop(e, col.status)}
          >
            {/* Cabeçalho */}
            <div className="flex items-center justify-between px-1 flex-shrink-0">
              <h3 className={cn('text-[10px] font-black uppercase tracking-[0.15em]', col.colorClass)}>
                {col.label}
              </h3>
              <span className={cn('text-[10px] font-black px-2 py-0.5 rounded-full bg-background/40', col.colorClass)}>
                {colTasks.length}
              </span>
            </div>

            {/* Drop zone hint */}
            {isOver && draggingId && (
              <div className={cn(
                'rounded-xl border-2 border-dashed h-16 flex items-center justify-center',
                'text-[10px] font-black uppercase opacity-60',
                col.colorClass
              )}>
                Soltar aqui
              </div>
            )}

            {/* Cards */}
            <div className="flex flex-col gap-2">
              {colTasks.length === 0 && !isOver ? (
                <div className="flex items-center justify-center text-[10px] text-content-secondary/40 font-semibold py-8 text-center">
                  Nenhuma tarefa
                </div>
              ) : (
                colTasks.map(task => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={e => handleDragStart(e, task.id)}
                    onDragEnd={handleDragEnd}
                    className={cn(
                      'cursor-grab active:cursor-grabbing',
                      draggingId === task.id && 'opacity-40 scale-95 transition-transform'
                    )}
                  >
                    <TaskCard
                      task={task}
                      onEdit={onEdit}
                      onStatusChange={onStatusChange}
                      onDelete={onDelete}
                      isDragging={draggingId === task.id}
                    />
                  </div>
                ))
              )}
            </div>
          </div>
        )
      })}
    </div>
  )
}
