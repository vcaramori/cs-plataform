'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import Link from 'next/link'
import { motion } from 'framer-motion'
import { Skeleton } from '@/components/ui/skeleton'
import { AlertCircle, TrendingUp, Target, ArrowRight, CheckCircle2, Clock, CalendarDays, CheckCheck } from 'lucide-react'
import { cn } from '@/lib/utils'
import { DailyHomePriority } from '@/lib/supabase/types'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { CsmTask } from '@/lib/supabase/types'

/** Rótulos PT amigáveis para os tipos de ação das prioridades. */
const ACTION_LABELS: Record<string, string> = {
  renewal_review: 'Revisar renovação',
  renewal_negotiation: 'Negociar renovação',
  health_remediation: 'Recuperar health',
  csm_intervention: 'Intervir',
  playbook_execution: 'Executar playbook',
  expansion_pitch: 'Explorar expansão',
  adoption_check: 'Checar adoção',
  engagement_check: 'Checar engajamento',
  review: 'Revisar',
}

function actionLabel(actionType?: string | null): string {
  if (!actionType) return ''
  return ACTION_LABELS[actionType] ?? actionType.replace(/_/g, ' ')
}

interface SectionStyle {
  label: string
  subtitle: string
  icon: React.FC<{ className?: string }>
  color: string
  bar: string
  iconBg: string
  iconBorder: string
  chip: string
  glow: string
  hoverBorder: string
  arrow: string
}

const CATEGORY: Record<'focar_agora' | 'manter_momentum' | 'oportunidade', SectionStyle> = {
  focar_agora: {
    label: 'Focar Agora', subtitle: 'Risco e urgência', icon: AlertCircle,
    color: 'text-red-500', bar: 'bg-red-500', iconBg: 'bg-red-500/10', iconBorder: 'border-red-500/20',
    chip: 'bg-red-500/15 text-red-500', glow: 'bg-red-500/20', hoverBorder: 'hover:border-red-500/40', arrow: 'group-hover:text-red-500',
  },
  manter_momentum: {
    label: 'Manter Momentum', subtitle: 'Acompanhar de perto', icon: TrendingUp,
    color: 'text-amber-500', bar: 'bg-amber-500', iconBg: 'bg-amber-500/10', iconBorder: 'border-amber-500/20',
    chip: 'bg-amber-500/15 text-amber-600', glow: 'bg-amber-500/20', hoverBorder: 'hover:border-amber-500/40', arrow: 'group-hover:text-amber-500',
  },
  oportunidade: {
    label: 'Oportunidade', subtitle: 'Expansão e upsell', icon: Target,
    color: 'text-emerald-500', bar: 'bg-emerald-500', iconBg: 'bg-emerald-500/10', iconBorder: 'border-emerald-500/20',
    chip: 'bg-emerald-500/15 text-emerald-600', glow: 'bg-emerald-500/20', hoverBorder: 'hover:border-emerald-500/40', arrow: 'group-hover:text-emerald-500',
  },
}

const TASK_OVERDUE: SectionStyle = {
  label: 'Atividades Atrasadas', subtitle: 'Vencidas — priorize', icon: Clock,
  color: 'text-red-500', bar: 'bg-red-500', iconBg: 'bg-red-500/10', iconBorder: 'border-red-500/20',
  chip: 'bg-red-500/15 text-red-500', glow: 'bg-red-500/20', hoverBorder: '', arrow: '',
}
const TASK_TODAY: SectionStyle = {
  label: 'Atividades de Hoje', subtitle: 'Para resolver hoje', icon: CalendarDays,
  color: 'text-amber-500', bar: 'bg-amber-500', iconBg: 'bg-amber-500/10', iconBorder: 'border-amber-500/20',
  chip: 'bg-amber-500/15 text-amber-600', glow: 'bg-amber-500/20', hoverBorder: '', arrow: '',
}

const Chip = ({ children, className }: { children: React.ReactNode; className?: string }) => (
  <span className={cn('inline-flex items-center text-[9px] font-black uppercase tracking-tight px-1.5 py-0.5 rounded-md bg-surface-background text-content-secondary border border-border-divider shrink-0', className)}>
    {children}
  </span>
)

function SectionHead({ cfg, count, unit }: { cfg: SectionStyle; count: number; unit: string }) {
  const Icon = cfg.icon
  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={cn('w-9 h-9 rounded-xl flex items-center justify-center border', cfg.iconBg, cfg.iconBorder)}>
        <Icon className={cn('w-4 h-4', cfg.color)} />
      </div>
      <div className="min-w-0">
        <h3 className="text-sm font-black uppercase tracking-tight text-content-primary leading-none">{cfg.label}</h3>
        <p className="text-[10px] font-bold uppercase tracking-widest text-content-secondary/50 mt-1">{cfg.subtitle}</p>
      </div>
      <span className={cn('ml-auto text-[10px] font-black px-2.5 py-1 rounded-full border', cfg.iconBg, cfg.iconBorder, cfg.color)}>
        {count} {unit}
      </span>
    </div>
  )
}

function PriorityCard({ priority, cfg, index }: { priority: any; cfg: SectionStyle; index: number }) {
  const Icon = cfg.icon
  const name = priority.accounts?.name || 'Conta'
  const segment = priority.accounts?.segment
  return (
    <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3, delay: index * 0.04 }}>
      <Link href={`/accounts/${priority.account_id}`} className="block group h-full">
        <div className={cn(
          'relative overflow-hidden rounded-xl bg-surface-card border border-border-divider shadow-premium transition-all duration-300 hover:-translate-y-0.5 hover:shadow-lg h-full',
          cfg.hoverBorder
        )}>
          <div className={cn('absolute left-0 top-0 bottom-0 w-1', cfg.bar)} />
          <div className={cn('absolute -right-12 -top-12 w-32 h-32 rounded-full blur-3xl opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none', cfg.glow)} />
          <div className="relative flex items-start gap-3 p-3.5 pl-4">
            <div className={cn('w-8 h-8 rounded-lg flex items-center justify-center flex-shrink-0 border transition-transform group-hover:scale-105', cfg.iconBg, cfg.iconBorder)}>
              <Icon className={cn('w-4 h-4', cfg.color)} />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5">
                <p className="text-sm font-bold text-content-primary truncate">{name}</p>
                {segment && <Chip>{segment}</Chip>}
              </div>
              <p className="text-xs text-content-secondary mt-0.5 line-clamp-2 leading-snug">{priority.reason}</p>
              {priority.action_type && (
                <span className={cn('inline-flex items-center gap-1 mt-1.5 text-[9px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full', cfg.chip)}>
                  <Icon className="w-2.5 h-2.5" /> {actionLabel(priority.action_type)}
                </span>
              )}
            </div>
            <ArrowRight className={cn('w-4 h-4 flex-shrink-0 mt-0.5 text-content-secondary/30 transition-all group-hover:translate-x-1', cfg.arrow)} />
          </div>
        </div>
      </Link>
    </motion.div>
  )
}

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

  const db = supabase

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10)
    db
      .from('csm_tasks')
      .select('id, title, status, priority, due_date, accounts(name)')
      .eq('due_date', today)
      .in('status', ['todo', 'in_progress'])
      .order('priority', { ascending: false })
      .limit(5)
      .then(({ data }) => setTodayTasks((data as CsmTask[] | null) ?? []))

    db
      .from('csm_tasks')
      .select('id, title, status, priority, due_date, accounts(name)')
      .lt('due_date', today)
      .in('status', ['todo', 'in_progress'])
      .order('due_date', { ascending: true })
      .limit(5)
      .then(({ data }) => setOverdueTasks((data as CsmTask[] | null) ?? []))
  }, [db])

  const categorized = {
    focar_agora: priorities?.filter(p => p.category === 'focar_agora') || [],
    manter_momentum: priorities?.filter(p => p.category === 'manter_momentum') || [],
    oportunidade: priorities?.filter(p => p.category === 'oportunidade') || [],
  }

  const TaskRow = ({ task, accent }: { task: CsmTask; accent: SectionStyle }) => (
    <div className="flex items-center gap-3 py-2.5 border-b border-border-divider/40 last:border-0 hover:bg-surface-background/40 -mx-2 px-2 rounded-lg transition-colors">
      <span className={cn('w-1.5 h-1.5 rounded-full flex-shrink-0', accent.bar)} />
      <CheckCircle2 className="w-4 h-4 flex-shrink-0 text-content-secondary/40" />
      <span className="text-sm font-medium text-content-primary truncate flex-1">{task.title}</span>
      {task.accounts?.name && <Chip className="hidden sm:inline-flex">{(task.accounts as any).name}</Chip>}
      {task.due_date && (
        <span className={cn('text-[10px] font-bold whitespace-nowrap', accent.color)}>
          {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
        </span>
      )}
    </div>
  )

  function TaskSection({ cfg, tasks }: { cfg: SectionStyle; tasks: CsmTask[] }) {
    return (
      <div>
        <SectionHead cfg={cfg} count={tasks.length} unit={tasks.length === 1 ? 'tarefa' : 'tarefas'} />
        <div className="relative overflow-hidden rounded-xl bg-surface-card border border-border-divider shadow-premium h-full">
          <div className={cn('absolute left-0 top-0 bottom-0 w-1', cfg.bar)} />
          <div className="p-3.5 pl-4">
            {tasks.map(t => <TaskRow key={t.id} task={t} accent={cfg} />)}
            <div className="pt-3">
              <Link href="/atividades" className={cn('text-[10px] font-black uppercase flex items-center gap-1 hover:gap-2 transition-all', cfg.color)}>
                Ver todas <ArrowRight className="w-3 h-3" />
              </Link>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const hasPriorities = (priorities?.length ?? 0) > 0
  const hasTasks = overdueTasks.length > 0 || todayTasks.length > 0
  const isEmpty = !isLoading && !hasPriorities && !hasTasks

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <h2 className="h2-section">Ações de Hoje</h2>
        <div className="h-px flex-1 bg-gradient-to-r from-border-divider to-transparent" />
      </div>

      {isEmpty && (
        <div className="flex flex-col items-center justify-center py-20 bg-surface-card border border-dashed border-border-divider rounded-2xl shadow-premium">
          <div className="w-16 h-16 bg-success/10 border border-success/20 rounded-2xl flex items-center justify-center mb-4">
            <CheckCheck className="w-8 h-8 text-success" />
          </div>
          <p className="text-sm font-bold text-content-primary">Tudo em dia 🎉</p>
          <p className="text-xs text-content-secondary mt-1">Nenhuma ação pendente para hoje.</p>
        </div>
      )}

      {hasTasks && (
        <div className="grid gap-4 lg:grid-cols-2">
          {overdueTasks.length > 0 && <TaskSection cfg={TASK_OVERDUE} tasks={overdueTasks} />}
          {todayTasks.length > 0 && <TaskSection cfg={TASK_TODAY} tasks={todayTasks} />}
        </div>
      )}

      {Object.entries(categorized).map(([key, items]) => {
        const cfg = CATEGORY[key as keyof typeof CATEGORY]

        if (!isLoading && items.length === 0) return null

        return (
          <div key={key}>
            <SectionHead cfg={cfg} count={items.length} unit={items.length === 1 ? 'conta' : 'contas'} />
            {isLoading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {[1, 2, 3].map(i => <Skeleton key={i} className="h-20 rounded-xl" />)}
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 2xl:grid-cols-3 gap-3">
                {items.map((priority, i) => (
                  <PriorityCard key={priority.id} priority={priority} cfg={cfg} index={i} />
                ))}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
