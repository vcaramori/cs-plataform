'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CreateTaskModal } from '@/app/(dashboard)/atividades/components/CreateTaskModal'
import { TaskDetailSheet } from '@/app/(dashboard)/atividades/components/TaskDetailSheet'
import { Plus, ArrowRight, CheckCircle2, Clock, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { CsmTask, CsmTaskStatus } from '@/lib/supabase/types'

const statusIcon = {
  todo:        Clock,
  in_progress: AlertCircle,
  suggested:   CheckCircle2,
}

const statusColor: Record<string, string> = {
  todo:        'text-content-secondary',
  in_progress: 'text-amber-500',
  suggested:   'text-accent',
}

interface Props {
  accountId: string
  accountName: string
}

export function AccountActivitiesWidget({ accountId, accountName }: Props) {
  const supabase = getSupabaseBrowserClient()
  const [tasks, setTasks] = useState<CsmTask[]>([])
  const [modalOpen, setModalOpen] = useState(false)
  const [editTask, setEditTask] = useState<CsmTask | null>(null)
  const [detailTask, setDetailTask] = useState<CsmTask | null>(null)

  const db = supabase

  useEffect(() => {
    db
      .from('csm_tasks')
      .select('*, accounts(name)')
      .eq('account_id', accountId)
      .in('status', ['todo', 'in_progress', 'suggested'])
      .is('deleted_at', null)
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5)
      .then(({ data }) => setTasks((data as CsmTask[] | null) ?? []))
  }, [db, accountId])

  function handleSaved(task: CsmTask) {
    setTasks(prev => {
      const exists = prev.some(t => t.id === task.id)
      // tarefa concluída/cancelada some da lista de pendentes
      if (task.status === 'completed' || task.status === 'cancelled') return prev.filter(t => t.id !== task.id)
      return exists ? prev.map(t => (t.id === task.id ? task : t)) : [task, ...prev].slice(0, 5)
    })
  }

  async function handleStatusChange(id: string, status: CsmTaskStatus) {
    const patch: Record<string, any> = { status }
    if (status === 'completed') patch.completed_at = new Date().toISOString()
    await db.from('csm_tasks').update(patch).eq('id', id)
    setTasks(prev => (status === 'completed' || status === 'cancelled')
      ? prev.filter(t => t.id !== id)
      : prev.map(t => (t.id === id ? { ...t, status } : t)))
    setDetailTask(prev => (prev && prev.id === id ? { ...prev, status } : prev))
  }

  return (
    <>
      <div className="space-y-3">
        {tasks.length === 0 ? (
          <p className="text-xs text-content-secondary/60 text-center py-4">
            Nenhuma atividade pendente.
          </p>
        ) : (
          tasks.map(task => {
            const StatusIcon = statusIcon[task.status as keyof typeof statusIcon] ?? Clock
            const isOverdue = task.due_date && new Date(task.due_date + 'T00:00:00') < new Date()
            return (
              <button
                key={task.id}
                type="button"
                onClick={() => setDetailTask(task)}
                className="w-full text-left flex items-start justify-between gap-2 py-2 border-b border-border-divider/50 last:border-0 hover:bg-surface-background/40 rounded-lg px-1 -mx-1 transition-colors"
              >
                <div className="flex items-start gap-2 min-w-0">
                  <StatusIcon className={cn('w-3.5 h-3.5 flex-shrink-0 mt-0.5', statusColor[task.status] ?? 'text-content-secondary')} />
                  <div className="min-w-0">
                    <span className={cn('block text-xs font-medium text-content-primary truncate', isOverdue && 'text-destructive')}>
                      {task.title}
                    </span>
                    {task.description && (
                      <span className="block text-[11px] text-content-secondary/80 line-clamp-1">{task.description}</span>
                    )}
                  </div>
                </div>
                {task.due_date && (
                  <span className={cn('text-[10px] font-semibold flex-shrink-0 mt-0.5', isOverdue ? 'text-destructive' : 'text-content-secondary')}>
                    {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </button>
            )
          })
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-[10px] font-black uppercase"
            onClick={() => { setEditTask(null); setModalOpen(true) }}
          >
            <Plus className="w-3 h-3" />
            Criar
          </Button>
          <Link
            href={`/atividades?account=${accountId}`}
            className="flex items-center gap-1 text-[10px] font-black uppercase text-primary hover:text-primary/80 transition-colors"
          >
            Ver todas <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      </div>

      {/* Detalhe da atividade (reusa o modal de Atividades) */}
      <TaskDetailSheet
        task={detailTask}
        open={!!detailTask}
        onOpenChange={(open) => !open && setDetailTask(null)}
        onEdit={(task) => { setDetailTask(null); setEditTask(task); setModalOpen(true) }}
        onStatusChange={handleStatusChange}
      />

      {/* Criar/editar atividade */}
      <CreateTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={handleSaved}
        editTask={editTask}
        prefill={{ account_id: accountId, source_label: 'manual' }}
      />
    </>
  )
}
