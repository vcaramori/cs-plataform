'use client'

import { useState } from 'react'
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { CheckCircle2, Circle, Mail, Calendar, Search, ArrowRight } from "lucide-react"
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'

export function PlaybookWidget({ playbook }: { playbook: any }) {
  const [tasks, setTasks] = useState(playbook?.tasks || [])
  const [showEmailModal, setShowEmailModal] = useState(false)
  const [selectedTask, setSelectedTask] = useState<any>(null)
  const [showTimeModal, setShowTimeModal] = useState(false)
  const [timeSpentInput, setTimeSpentInput] = useState<string>('')

  const router = useRouter()
  const [isCompleting, setIsCompleting] = useState(false)

  if (!playbook) return null

  const totalTasks = tasks.length
  const completedTasks = tasks.filter((t: any) => t.status === 'completed').length
  const progress = totalTasks > 0 ? (completedTasks / totalTasks) * 100 : 0
  const isAllDone = completedTasks === totalTasks && totalTasks > 0

  const handleTaskClick = async (task: any) => {
    if (task.status === 'completed') return

    // Se for tarefa de email, abre o modal de check-in automatizado
    if (task.task?.task_type === 'email') {
      setSelectedTask(task)
      setShowEmailModal(true)
    } else {
      // Para outras tarefas, pede time spent
      setSelectedTask(task)
      setTimeSpentInput('')
      setShowTimeModal(true)
    }
  }

  const handleCompleteWithTime = async () => {
    const hours = timeSpentInput ? parseFloat(timeSpentInput) : undefined
    if (hours !== undefined && (hours < 0 || hours > 24)) {
      alert('Horas deve ser entre 0 e 24')
      return
    }
    await updateTaskStatus(selectedTask.id, 'completed', hours)
    setShowTimeModal(false)
    setTimeSpentInput('')
    setSelectedTask(null)
  }

  const updateTaskStatus = async (taskId: string, status: string, timeSpentHours?: number) => {
    try {
      const res = await fetch(`/api/account-playbooks/${playbook.id}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          time_spent_hours: timeSpentHours || null,
        })
      })

      if (!res.ok) {
        const errData = await res.json()
        throw new Error(errData.error || 'Falha ao atualizar task')
      }

      const updatedTask = await res.json()
      setTasks(tasks.map((t: any) => t.id === taskId ? updatedTask : t))
    } catch (err) {
      console.error('Erro ao atualizar task:', err)
    }
  }

  const handleCompletePlaybook = async () => {
    setIsCompleting(true)
    try {
      const response = await fetch(`/api/playbooks/${playbook.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status: 'completed',
          account_id: playbook.account_id,
          title: playbook.template?.name,
          description: playbook.template?.description
        })
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || 'Falha ao concluir playbook')
      }
      
      router.refresh()
    } catch (err) {
      console.error('Erro ao concluir playbook:', err)
      setIsCompleting(false)
    }
  }

  const handleSendEmail = async () => {
    await updateTaskStatus(selectedTask.id, 'completed')
    setShowEmailModal(false)
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-4 h-4 text-warning" />
      case 'meeting': return <Calendar className="w-4 h-4 text-success" />
      case 'review': return <Search className="w-4 h-4 text-indigo-500" />
      default: return <CheckCircle2 className="w-4 h-4 text-content-secondary/40" />
    }
  }

  return (
    <>
      <Card variant="glass" className={cn(
        "border-red-500/20 shadow-md bg-white dark:bg-slate-950 transition-all duration-500",
        isAllDone && "border-success-500/40 bg-success/5 shadow-emerald-500/10"
      )}>
        <div className={cn(
          "p-4 border-b border-border transition-colors duration-500",
          isAllDone ? "bg-success/10" : "bg-red-500/5"
        )}>
          <div className="flex justify-between items-center mb-2">
            <h3 className={cn(
              "text-sm font-bold transition-colors duration-500",
              isAllDone ? "text-emerald-600 dark:text-emerald-400" : "text-destructive dark:text-red-400"
            )}>
              {isAllDone ? '✓ Playbook Finalizado' : `Playbook Ativo: ${playbook.template?.name}`}
            </h3>
            <Badge 
              variant="neutral" 
              className={cn(
                "transition-all duration-500 font-bold",
                isAllDone 
                  ? "bg-emerald-100 text-emerald-700 dark:bg-success/20 dark:text-emerald-400 animate-pulse" 
                  : "bg-red-100 text-red-700 dark:bg-red-500/20 dark:text-red-400"
              )}
            >
              {isAllDone ? 'Concluído' : 'Em Progresso'}
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground mb-3">
            {isAllDone 
              ? 'Todas as tarefas foram executadas. Mova para a timeline para encerrar a jornada.' 
              : playbook.template?.description}
          </p>
          <Progress 
            value={progress} 
            className={cn(
              "h-1.5 transition-all duration-500",
              isAllDone ? "bg-emerald-100 dark:bg-success/20" : "bg-red-100 dark:bg-red-500/20"
            )} 
          />
          
          {isAllDone ? (
            <button
              onClick={handleCompletePlaybook}
              disabled={isCompleting}
              className="w-full mt-4 py-2 rounded-xl bg-emerald-600 text-white text-[10px] font-black uppercase tracking-widest hover:bg-emerald-700 transition-all flex items-center justify-center gap-2 shadow-lg shadow-emerald-500/20"
            >
              {isCompleting ? 'Processando...' : 'Mover para Timeline'} <ArrowRight className="w-3 h-3" />
            </button>
          ) : (
            <button
              onClick={() => router.push(`/playbooks/execution/${playbook.id}`)}
              className="w-full mt-4 py-2 rounded-xl bg-primary text-primary-foreground text-[10px] font-black uppercase tracking-widest hover:bg-primary/90 transition-all flex items-center justify-center gap-2 shadow-lg shadow-primary/20"
            >
              Executar Playbook <ArrowRight className="w-3 h-3" />
            </button>
          )}
        </div>
        
        <div className="p-2 space-y-1">
          {tasks.map((task: any) => (
            <div 
              key={task.id}
              onClick={() => handleTaskClick(task)}
              className={`flex items-center gap-3 p-3 rounded-xl transition-all cursor-pointer ${
                task.status === 'completed' 
                  ? 'opacity-50 line-through bg-transparent' 
                  : 'hover:bg-muted bg-card border border-border shadow-sm'
              }`}
            >
              <div className="shrink-0">
                {task.status === 'completed' 
                  ? <CheckCircle2 className="w-5 h-5 text-success" /> 
                  : <Circle className="w-5 h-5 text-muted-foreground" />}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <span className="text-xs font-semibold truncate">{task.title || task.task?.title}</span>
                  {task.task?.assigned_role && (
                    <Badge variant="secondary" className="text-[9px] py-0.5">
                      {task.task.assigned_role}
                    </Badge>
                  )}
                </div>
                <p className="text-[10px] text-muted-foreground truncate mt-0.5">{task.description || task.task?.description}</p>
                {task.time_spent_hours && (
                  <p className="text-[9px] text-emerald-600 dark:text-emerald-400 mt-1">
                    ⏱️ {task.time_spent_hours}h gastos
                  </p>
                )}
              </div>
              <div className="shrink-0">
                {getTaskIcon(task.task_type || task.task?.task_type)}
              </div>
            </div>
          ))}
        </div>
      </Card>

      {showEmailModal && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-white dark:bg-slate-950 shadow-2xl border-border animate-in zoom-in-95">
            <div className="p-6">
              <h3 className="text-lg font-black mb-2 flex items-center gap-2 text-foreground">
                <Mail className="w-5 h-5 text-primary" /> Disparo de E-mail Automatizado
              </h3>
              <p className="text-sm text-muted-foreground mb-4">
                A IA sugeriu o seguinte template baseado no Health Score da conta. Edite se necessário e confirme o disparo.
              </p>
              
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-bold opacity-60 uppercase mb-1 block text-foreground">Assunto</label>
                  <input 
                    type="text" 
                    defaultValue="Alinhamento Estratégico - Vamos conversar?"
                    className="w-full bg-muted/30 border border-border rounded-lg p-2 text-sm focus:outline-none text-foreground"
                  />
                </div>
                <div>
                  <label className="text-xs font-bold opacity-60 uppercase mb-1 block text-foreground">Corpo do E-mail</label>
                  <textarea 
                    rows={6}
                    defaultValue={"Olá,\n\nNotei que nas últimas semanas nosso Health Score indicou alguns pontos de atrito no uso da plataforma.\n\nComo seu CSM, gostaria de agendar uma ligação rápida de 15 minutos para entendermos os gargalos e montarmos um plano de ação.\n\nQual o melhor horário para você?"}
                    className="w-full bg-muted/30 border border-border rounded-lg p-3 text-sm focus:outline-none resize-none text-foreground"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button 
                  onClick={() => setShowEmailModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent/10 transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  onClick={handleSendEmail}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 transition-colors"
                >
                  Disparar E-mail <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}

      {showTimeModal && selectedTask && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4">
          <Card className="w-full max-w-sm bg-white dark:bg-slate-950 shadow-2xl border-border animate-in zoom-in-95">
            <div className="p-6">
              <h3 className="text-base font-black mb-4 text-foreground">Quantas horas você gastou?</h3>

              <div className="space-y-4">
                <p className="text-sm text-muted-foreground">{selectedTask.task?.title}</p>
                <div>
                  <label className="text-xs font-bold mb-2 block">Horas (0-24)</label>
                  <input
                    type="number"
                    min="0"
                    max="24"
                    step="0.5"
                    value={timeSpentInput}
                    onChange={(e) => setTimeSpentInput(e.target.value)}
                    placeholder="Ex: 2.5"
                    className="w-full bg-muted/30 border border-border rounded-lg p-2 text-sm focus:outline-none text-foreground"
                    autoFocus
                  />
                </div>
              </div>

              <div className="flex justify-end gap-3 mt-6">
                <button
                  onClick={() => setShowTimeModal(false)}
                  className="px-4 py-2 rounded-lg text-sm font-semibold hover:bg-accent/10 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={handleCompleteWithTime}
                  className="px-4 py-2 rounded-lg text-sm font-semibold bg-primary text-primary-foreground hover:bg-primary/90 flex items-center gap-2 transition-colors"
                >
                  Concluir <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </>
  )
}
