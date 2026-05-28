'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { Button } from '@/components/ui/button'
import { CreateTaskModal } from '@/app/(dashboard)/atividades/components/CreateTaskModal'
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

  const db = supabase as any

  useEffect(() => {
    db
      .from('csm_tasks')
      .select('id, title, status, priority, due_date')
      .eq('account_id', accountId)
      .in('status', ['todo', 'in_progress', 'suggested'])
      .order('due_date', { ascending: true, nullsFirst: false })
      .limit(5)
      .then(({ data }: { data: CsmTask[] | null }) => setTasks(data ?? []))
  }, [db, accountId])

  function handleSaved(task: CsmTask) {
    setTasks(prev => [task, ...prev].slice(0, 5))
  }

  async function handleStatusChange(id: string, status: CsmTaskStatus) {
    await db.from('csm_tasks').update({ status }).eq('id', id)
    setTasks(prev => prev.filter((t: CsmTask) => t.id !== id))
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
              <div key={task.id} className="flex items-start justify-between gap-2 py-2 border-b border-border-divider/50 last:border-0">
                <div className="flex items-center gap-2 min-w-0">
                  <StatusIcon className={cn('w-3.5 h-3.5 flex-shrink-0', statusColor[task.status] ?? 'text-content-secondary')} />
                  <span className={cn('text-xs font-medium text-content-primary truncate', isOverdue && 'text-destructive')}>
                    {task.title}
                  </span>
                </div>
                {task.due_date && (
                  <span className={cn('text-[10px] font-semibold flex-shrink-0', isOverdue ? 'text-destructive' : 'text-content-secondary')}>
                    {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                  </span>
                )}
              </div>
            )
          })
        )}

        <div className="flex items-center justify-between pt-1">
          <Button
            size="sm"
            variant="outline"
            className="h-7 gap-1.5 text-[10px] font-black uppercase"
            onClick={() => setModalOpen(true)}
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

      <CreateTaskModal
        open={modalOpen}
        onOpenChange={setModalOpen}
        onSaved={handleSaved}
        prefill={{ account_id: accountId, source_label: 'manual' }}
      />
    </>
  )
}
