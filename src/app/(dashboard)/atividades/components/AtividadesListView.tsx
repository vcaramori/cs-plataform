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
  onOpenDetail: (task: CsmTask) => void
}

type Group = {
  key: string
  label: string
  tasks: CsmTask[]
  colorClass: string
  bar: string
}

const GROUP_BAR: Record<string, string> = {
  overdue: 'bg-destructive', today: 'bg-amber-500', week: 'bg-primary', upcoming: 'bg-content-secondary/50', no_date: 'bg-content-secondary/30',
}

function getGroupKey(task: CsmTask): string {
  if (task.status === 'completed' || task.status === 'cancelled') return 'done'
  if (!task.due_date) return 'no_date'

  const due = new Date(task.due_date + 'T00:00:00')
  const today = new Date()
  today.setHours(0, 0, 0, 0)

  const diffDays = Math.ceil((due.getTime() - today.getTime()) / 86400000)

  if (diffDays < 0) return 'overdue'
  if (diffDays === 0) return 'today'
  if (diffDays <= 7) return 'week'
  return 'upcoming'
}

export function AtividadesListView({ tasks, onEdit, onStatusChange, onDelete, onOpenDetail }: Props) {
  const groups = useMemo<Group[]>(() => {
    const grouped: Record<string, CsmTask[]> = {}

    const activeTasks = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled')

    activeTasks.forEach(task => {
      const key = getGroupKey(task)
      if (!grouped[key]) grouped[key] = []
      grouped[key].push(task)
    })

    const orderedGroups: Group[] = [
      { key: 'overdue',  label: 'Atrasadas',    tasks: grouped.overdue  ?? [], colorClass: 'text-destructive',          bar: GROUP_BAR.overdue },
      { key: 'today',    label: 'Hoje',          tasks: grouped.today    ?? [], colorClass: 'text-amber-500',            bar: GROUP_BAR.today },
      { key: 'week',     label: 'Esta semana',   tasks: grouped.week     ?? [], colorClass: 'text-content-primary',      bar: GROUP_BAR.week },
      { key: 'upcoming', label: 'Próximas',      tasks: grouped.upcoming ?? [], colorClass: 'text-content-secondary',    bar: GROUP_BAR.upcoming },
      { key: 'no_date',  label: 'Sem data',      tasks: grouped.no_date  ?? [], colorClass: 'text-content-secondary/60', bar: GROUP_BAR.no_date },
    ]

    return orderedGroups.filter(g => g.tasks.length > 0)
  }, [tasks])

  if (groups.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-24 text-content-secondary">
        <p className="text-sm font-semibold">Nenhuma atividade pendente.</p>
        <p className="text-xs mt-1 opacity-60">Clique em &ldquo;+ Nova&rdquo; para criar a primeira.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {groups.map(group => (
        <div key={group.key}>
          <div className="flex items-center gap-2 mb-3">
            <span className={cn('w-1 h-3.5 rounded-full', group.bar)} />
            <h3 className={cn('text-xs font-black uppercase tracking-[0.15em]', group.colorClass)}>
              {group.label}
            </h3>
            <span className="text-[10px] font-bold text-content-secondary/60 bg-muted px-2 py-0.5 rounded-full">
              {group.tasks.length}
            </span>
          </div>

          <div className="space-y-2">
            {group.tasks.map(task => (
              <TaskCard
                key={task.id}
                task={task}
                onEdit={onEdit}
                onStatusChange={onStatusChange}
                onDelete={onDelete}
                onOpenDetail={onOpenDetail}
              />
            ))}
          </div>
        </div>
      ))}
    </div>
  )
}
