'use client'

import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { CheckCircle2, Mail, Sparkles, MessageSquare, Target, Clock } from 'lucide-react'
import { cn } from '@/lib/utils'

interface PlaybookHistoryModalProps {
  playbook: any | null
  onOpenChange: (open: boolean) => void
}

export function PlaybookHistoryModal({ playbook, onOpenChange }: PlaybookHistoryModalProps) {
  if (!playbook) return null

  const tasks = playbook.tasks || []
  const trigger = playbook.template?.name || 'Início Manual'

  return (
    <Dialog open={!!playbook} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white max-w-2xl p-0 overflow-hidden rounded-2xl shadow-2xl">
        <DialogHeader className="space-y-4 border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 p-8">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shadow-sm">
              <Sparkles className="w-8 h-8 text-emerald-500" />
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <DialogTitle className="text-2xl font-black text-[#2d3558] dark:text-white uppercase tracking-tighter">Histórico de Playbook</DialogTitle>
                <Badge className="bg-emerald-50 dark:bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-200 dark:border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2">Finalizado</Badge>
              </div>
              <p className="text-[11px] font-bold text-slate-500 dark:text-slate-400 uppercase tracking-[0.2em]">{playbook.template?.name || 'Jornada Estratégica'}</p>
            </div>
          </div>
        </DialogHeader>

        <div className="p-8 space-y-8 max-h-[75vh] overflow-y-auto custom-scrollbar">

          {/* Resumo e Gatilho */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                <Target className="w-3.5 h-3.5" /> Gatilho de Origem
              </div>
              <p className="text-[#2d3558] dark:text-white text-base font-black tracking-tight">{trigger}</p>
              <p className="text-[10px] text-slate-500 dark:text-slate-400 font-medium leading-relaxed italic">
                {playbook.template?.description || 'Este playbook foi disparado automaticamente baseado no comportamento da conta.'}
              </p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="flex items-center gap-2 text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">
                <Clock className="w-3.5 h-3.5" /> Ciclo de Execução
              </div>
              <div className="space-y-1">
                <p className="text-[#2d3558] dark:text-white text-xs font-bold tracking-tight">Finalizado em:</p>
                <p className="text-lg font-black text-[#2d3558] dark:text-white tabular-nums">
                  {playbook.date ? new Date(playbook.date).toLocaleDateString('pt-BR') : 'Recentemente'}
                </p>
              </div>
            </div>
          </div>

          {/* Timeline de Atividades */}
          <div className="space-y-6">
            <div className="flex items-center gap-2">
              <MessageSquare className="w-4 h-4 text-emerald-500" />
              <p className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">Atividades Realizadas</p>
            </div>

            <div className="space-y-4">
              {tasks.map((task: any, idx: number) => (
                <div key={task.id} className="relative pl-8 group">
                  {/* Linha da Timeline */}
                  {idx < tasks.length - 1 && (
                    <div className="absolute left-[15px] top-10 bottom-0 w-px bg-slate-200 dark:bg-slate-800 group-hover:bg-emerald-200 dark:group-hover:bg-emerald-500 transition-colors" />
                  )}
                  
                  {/* Ícone de Check */}
                  <div className="absolute left-0 top-1 w-8 h-8 rounded-full bg-emerald-50 dark:bg-emerald-500/10 flex items-center justify-center border border-emerald-200 dark:border-emerald-500/20 z-10 group-hover:scale-110 transition-transform shadow-sm">
                    {task.task?.task_type === 'email' ? <Mail className="w-4 h-4 text-emerald-500" /> : <CheckCircle2 className="w-4 h-4 text-emerald-500" />}
                  </div>

                  <div className="bg-white dark:bg-slate-900 p-5 rounded-2xl border border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-all shadow-sm">
                    <div className="flex justify-between items-start mb-2">
                      <p className="text-sm font-black text-[#2d3558] dark:text-white tracking-tight">{task.task?.title || 'Tarefa do Playbook'}</p>
                      {task.completed_at && (
                        <span className="text-[9px] font-bold text-slate-400 dark:text-slate-500 uppercase tracking-widest">
                          {new Date(task.completed_at).toLocaleDateString('pt-BR')}
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium mb-4">
                      {task.task?.description}
                    </p>

                    {/* Simulação de Detalhe de E-mail se for o caso */}
                    {task.task?.task_type === 'email' && (
                      <div className="bg-emerald-50 dark:bg-emerald-500/10 p-4 rounded-xl border border-emerald-100 dark:border-emerald-500/20 space-y-2">
                        <div className="flex items-center gap-2 text-[9px] font-black text-emerald-600 uppercase tracking-widest">
                          <Mail className="w-3 h-3" /> E-mail de Check-in Enviado
                        </div>
                        <p className="text-[11px] text-slate-600 dark:text-slate-300 italic leading-relaxed">
                          "Olá, notei que nas últimas semanas nosso Health Score indicou alguns pontos de atrito..."
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div className="p-6 bg-slate-50 dark:bg-slate-800/50 border-t border-slate-200 dark:border-slate-800 flex justify-end rounded-b-2xl">
          <Button 
            variant="outline" 
            onClick={() => onOpenChange(false)} 
            className="rounded-xl px-8 h-10 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
          >
            Fechar Playbook
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
