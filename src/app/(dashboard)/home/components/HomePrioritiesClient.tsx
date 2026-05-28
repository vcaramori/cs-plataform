'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { Card, CardContent } from '@/components/ui/card'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, TrendingUp, Target, ArrowRight, CheckCircle2, Clock, CalendarDays } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyHomePriority } from '@/lib/supabase/types'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { CsmTask } from '@/lib/supabase/types'

export function HomePrioritiesClient() {
  const supabase = getSupabaseBrowserClient()
  const [todayTasks, setTodayTasks] = useState<CsmTask[]>([])
  const [overdueTasks, setOverdueTasks] = useState<CsmTask[]>([])

  const { data: priorities, isLoading } = useQuery({
    queryKey: ['home-priorities'],
    queryFn: async () => {
      const res = await fetch('/api/home-priorities')
      if (!res.ok) throw new Error('Failed to fetch priorities')
      return (await res.json()) as (DailyHomePriority & { accounts: { name: string; segment: string } })[]
    },
    staleTime: 1000 * 60 * 5, // 5 minutes
  })

  const db = supabase as any

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    // Tarefas de hoje (excluindo sugeridas)
    db
      .from('csm_tasks')
      .select('id, title, status, priority, due_date, accounts(name)')
      .eq('due_date', today)
      .in('status', ['todo', 'in_progress'])
      .order('priority', { ascending: false })
      .limit(5)
      .then(({ data }: { data: CsmTask[] | null }) => setTodayTasks(data ?? []))

    // Tarefas atrasadas (excluindo sugeridas)
    db
      .from('csm_tasks')
      .select('id, title, status, priority, due_date, accounts(name)')
      .lt('due_date', today)
      .in('status', ['todo', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(5)
      .then(({ data }: { data: CsmTask[] | null }) => setOverdueTasks(data ?? []))
  }, [db])

  const categorized = {
    focar_agora: priorities?.filter(p => p.category === 'focar_agora') || [],
    manter_momentum: priorities?.filter(p => p.category === 'manter_momentum') || [],
    oportunidade: priorities?.filter(p => p.category === 'oportunidade') || [],
  }

  const categoryConfig = {
    focar_agora: {
      label: 'Focar Agora',
      icon: AlertCircle,
      color: 'text-red-500',
      bg: 'bg-red-500/10',
      border: 'border-red-500/20',
    },
    manter_momentum: {
      label: 'Manter Momentum',
      icon: TrendingUp,
      color: 'text-warning',
      bg: 'bg-warning/10',
      border: 'border-warning-500/20',
    },
    oportunidade: {
      label: 'Oportunidade',
      icon: Target,
      color: 'text-success',
      bg: 'bg-success/10',
      border: 'border-success-500/20',
    },
  }

  const TaskRow = ({ task }: { task: CsmTask }) => (
    <div className="flex items-center justify-between gap-3 py-2 border-b border-border-divider/50 last:border-0">
      <div className="flex items-center gap-2 min-w-0">
        <CheckCircle2 className="w-3.5 h-3.5 flex-shrink-0 text-content-secondary/50" />
        <span className="text-sm font-medium text-content-primary truncate">{task.title}</span>
        {task.accounts?.name && (
          <span className="text-[10px] text-content-secondary/60 truncate hidden sm:block">— {(task.accounts as any).name}</span>
        )}
      </div>
      {task.due_date && (
        <span className="text-[10px] font-semibold text-destructive flex-shrink-0">
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </span>
      )}
    </div>
  )

  return (
    <div className="space-y-8">
      {/* Atividades: Atrasadas */}
      {overdueTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <Clock className="w-5 h-5 text-destructive" />
            <h2 className="text-lg font-bold text-content-primary">Atividades Atrasadas</h2>
            <span className="ml-auto text-xs font-bold text-content-secondary bg-surface-card px-3 py-1 rounded-full">
              {overdueTasks.length}
            </span>
          </div>
          <Card className="border-destructive/20 bg-destructive/5">
            <CardContent className="p-4 space-y-0">
              {overdueTasks.map(t => <TaskRow key={t.id} task={t} />)}
              <div className="pt-3">
                <Link href="/atividades" className="text-[10px] font-black uppercase text-destructive hover:text-destructive/80 flex items-center gap-1">
                  Ver todas <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {/* Atividades: Hoje */}
      {todayTasks.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-4">
            <CalendarDays className="w-5 h-5 text-amber-500" />
            <h2 className="text-lg font-bold text-content-primary">Atividades de Hoje</h2>
            <span className="ml-auto text-xs font-bold text-content-secondary bg-surface-card px-3 py-1 rounded-full">
              {todayTasks.length}
            </span>
          </div>
          <Card className="border-amber-500/20 bg-amber-500/5">
            <CardContent className="p-4 space-y-0">
              {todayTasks.map(t => <TaskRow key={t.id} task={t} />)}
              <div className="pt-3">
                <Link href="/atividades" className="text-[10px] font-black uppercase text-amber-500 hover:text-amber-400 flex items-center gap-1">
                  Ver todas <ArrowRight className="w-3 h-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      {Object.entries(categorized).map(([key, items]) => {
        const config = categoryConfig[key as keyof typeof categoryConfig]
        const Icon = config.icon

        return (
          <div key={key}>
            <div className="flex items-center gap-2 mb-4">
              <Icon className={cn('w-5 h-5', config.color)} />
              <h2 className="text-lg font-bold text-content-primary">{config.label}</h2>
              <span className="ml-auto text-xs font-bold text-content-secondary bg-surface-card px-3 py-1 rounded-full">
                {items.length} conta(s)
              </span>
            </div>

            {isLoading ? (
              <div className="grid grid-cols-1 gap-4">
                {[1, 2, 3].map(i => (
                  <Skeleton key={i} className="h-24 rounded-lg" />
                ))}
              </div>
            ) : items.length === 0 ? (
              <p className="text-content-secondary text-sm">Nenhuma prioridade nesta categoria hoje.</p>
            ) : (
              <div className="grid grid-cols-1 gap-4">
                {items.map(priority => (
                  <Link key={priority.id} href={`/accounts/${priority.account_id}`}>
                    <Card className={cn('cursor-pointer transition-all hover:shadow-md', config.border, config.bg)}>
                      <CardContent className="p-4">
                        <div className="flex items-start justify-between gap-4">
                          <div className="flex-1 min-w-0">
                            <p className="font-bold text-content-primary truncate">
                              {(priority as any).accounts?.name || 'Conta'}
                            </p>
                            <p className="text-sm text-content-secondary mt-1">{priority.reason}</p>
                            {priority.action_type && (
                              <p className="text-xs font-mono text-content-secondary/60 mt-2 uppercase tracking-tight">
                                Ação: {priority.action_type.replace(/_/g, ' ')}
                              </p>
                            )}
                          </div>
                          <ArrowRight className={cn('w-5 h-5 flex-shrink-0 transition-transform group-hover:translate-x-1', config.color)} />
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
