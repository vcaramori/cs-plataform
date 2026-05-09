'use client'

import { MessageSquare, Mail, CheckCircle2, Clock } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Loader2, Check } from 'lucide-react'
import { cn } from '@/lib/utils'

interface Task {
  id: string
  completed_at: string | null
  task: {
    title: string
    description: string
    task_type: string
  }
  comments?: any[]
  time_spent_hours?: number
}

interface PlaybookHistoryListProps {
  tasks: Task[]
  isEditing: boolean
  updatingTaskId: string | null
  onCompleteTask: (taskId: string, taskIndex: number) => void
  onEditTask: (idx: number, description: string) => void
}

export function PlaybookHistoryList({
  tasks,
  isEditing,
  updatingTaskId,
  onCompleteTask,
  onEditTask
}: PlaybookHistoryListProps) {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3 ml-1">
        <MessageSquare className="w-5 h-5 text-emerald-500" />
        <p className="text-[11px] text-[#2d3558] dark:text-white uppercase font-black tracking-[0.2em]">Checklist de Atividades Realizadas</p>
      </div>

      <div className="space-y-6 relative">
        <div className="absolute left-6 top-4 bottom-4 w-px bg-slate-200 dark:bg-slate-800" />

        <AnimatePresence mode="popLayout">
          {tasks.map((task: any, idx: number) => (
            <motion.div
              key={task.id}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: idx * 0.1 }}
              className="relative pl-14 group"
            >
              {/* Circle Icon */}
              <div className={cn(
                "absolute left-2 top-0 w-8 h-8 rounded-xl flex items-center justify-center border transition-all duration-300 z-10 shadow-sm",
                task.completed_at ? "bg-emerald-50 dark:bg-emerald-500/10 border-emerald-200 dark:border-emerald-500/20" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
              )}>
                {task.task?.task_type === 'email' ? (
                  <Mail className={cn("w-4 h-4", task.completed_at ? "text-emerald-500" : "text-slate-400")} />
                ) : (
                  <CheckCircle2 className={cn("w-4 h-4", task.completed_at ? "text-emerald-500" : "text-slate-400")} />
                )}
              </div>

              <div className={cn(
                "p-6 rounded-2xl border transition-all duration-300",
                isEditing ? "bg-white dark:bg-slate-900 border-emerald-500/30 shadow-lg" : "bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800"
              )}>
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <p className="text-sm font-black text-[#2d3558] dark:text-white tracking-tight">{task.task?.title || 'Tarefa do Playbook'}</p>
                    {task.completed_at && (
                      <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                        Concluído em {new Date(task.completed_at).toLocaleDateString('pt-BR')}
                      </span>
                    )}
                  </div>
                  <div className="flex items-center gap-2">
                    {!task.completed_at && !isEditing && (
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => onCompleteTask(task.id, idx)}
                        disabled={updatingTaskId === task.id}
                        className="text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500/10 text-[9px] font-bold uppercase tracking-widest h-7 px-2"
                      >
                        {updatingTaskId === task.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Check className="w-3 h-3 mr-1" />
                        )}
                        Concluir
                      </Button>
                    )}
                    {isEditing && (
                      <Badge variant="outline" className="text-[8px] font-bold uppercase tracking-widest border-emerald-500/20 text-emerald-500">Editável</Badge>
                    )}
                  </div>
                </div>

                <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                  {task.task?.description}
                </p>

                {task.task?.task_type === 'email' && !isEditing && (
                  <div className="mt-4 bg-emerald-500/[0.03] p-4 rounded-xl border border-emerald-500/10 flex items-start gap-3">
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                    <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
                      Interação de e-mail enviada automaticamente como parte desta jornada estratégica.
                    </p>
                  </div>
                )}

                {/* Time Spent */}
                {task.completed_at && task.time_spent_hours && (
                  <div className="mt-4 flex items-center gap-2 text-xs">
                    <Clock className="w-3.5 h-3.5 text-slate-400" />
                    <span className="font-semibold text-slate-600 dark:text-slate-300">{task.time_spent_hours}h gastos</span>
                  </div>
                )}
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </div>
  )
}
