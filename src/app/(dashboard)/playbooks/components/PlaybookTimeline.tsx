'use client'

import { useState } from 'react'
import { CheckCircle2, Circle, Mail, Calendar, Search, Clock, Plus, RefreshCcw, Loader2 } from 'lucide-react'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { togglePlaybookTaskStatus, addCustomTask } from '@/app/(dashboard)/playbooks/actions'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'

interface Task {
  id: string
  title: string
  description?: string
  status: string
  due_date: string
  task_type: string
  is_custom: boolean
  account_playbook_id: string
  playbook_tasks?: { is_note_required: boolean } | any
  profiles?: { full_name: string, avatar_url: string } | any
}

export function PlaybookTimeline({ tasks, playbookId }: { tasks: Task[], playbookId: string }) {
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  const [showAddCustom, setShowAddCustom] = useState(false)
  const [customTitle, setCustomTitle] = useState('')
  const [customDays, setCustomDays] = useState(1)
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({})

  const handleToggleStatus = async (task: Task) => {
    setLoadingTaskId(task.id)
    try {
      await togglePlaybookTaskStatus(task.id, task.status, task.account_playbook_id, taskNotes[task.id])
    } finally {
      setLoadingTaskId(null)
    }
  }

  const handleAddCustomTask = async () => {
    if (!customTitle) return
    setLoadingTaskId('new-custom')
    try {
      await addCustomTask(playbookId, {
        title: customTitle,
        task_type: 'manual',
        due_days: customDays
      })
      setShowAddCustom(false)
      setCustomTitle('')
      setCustomDays(1)
    } finally {
      setLoadingTaskId(null)
    }
  }

  const getTaskIcon = (type: string, status: string) => {
    if (status === 'completed') return <CheckCircle2 className="w-5 h-5 text-success" />
    switch (type) {
      case 'email': return <Mail className="w-5 h-5 text-warning" />
      case 'meeting': return <Calendar className="w-5 h-5 text-primary" />
      case 'review': return <Search className="w-5 h-5 text-indigo-500" />
      default: return <Circle className="w-5 h-5 text-muted-foreground" />
    }
  }

  return (
    <div className="space-y-6">
      <div className="relative border-l-2 border-border/50 ml-4 pl-6 space-y-8">
        {tasks.map((task) => {
          const isCompleted = task.status === 'completed'
          const isOverdue = !isCompleted && new Date(task.due_date) < new Date()

          return (
            <div key={task.id} className={cn("relative group transition-opacity", isCompleted && "opacity-60")}>
              {/* Icon Marker */}
              <div className={cn(
                "absolute -left-[35px] bg-background rounded-full p-1 border shadow-sm transition-colors",
                isCompleted ? "border-success bg-success/10" : "border-border",
                isOverdue && !isCompleted && "border-destructive bg-destructive/10"
              )}>
                {getTaskIcon(task.task_type, task.status)}
              </div>

              <Card className={cn(
                "p-4 rounded-2xl shadow-sm border transition-colors",
                isCompleted ? "border-success/20 bg-success/5" : "hover:border-primary/50",
                isOverdue && !isCompleted && "border-destructive/30 bg-destructive/5"
              )}>
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <h4 className={cn("font-semibold", isCompleted && "line-through text-muted-foreground")}>
                        {task.title}
                      </h4>
                      {task.is_custom && (
                        <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-accent">Custom</Badge>
                      )}
                    </div>
                    {task.description && (
                      <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
                    )}
                    
                    <div className="flex items-center gap-2 text-xs font-medium mt-1">
                      <Clock className={cn("w-3.5 h-3.5", isOverdue ? "text-destructive" : "text-muted-foreground")} />
                      <span className={cn(isOverdue && !isCompleted && "text-destructive")}>
                        Prazo: {format(new Date(task.due_date), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                        {isOverdue && !isCompleted && " (Atrasado)"}
                      </span>
                      {task.profiles?.full_name && (
                        <span className="text-muted-foreground ml-2 border-l border-border/50 pl-2">
                          Responsável: {task.profiles.full_name}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="flex flex-col gap-2 shrink-0 w-28">
                    {!isCompleted && !task.is_custom && (Array.isArray(task.playbook_tasks) ? task.playbook_tasks[0]?.is_note_required : task.playbook_tasks?.is_note_required) && (
                      <div className="flex flex-col gap-1">
                        <Label className="text-xs text-muted-foreground">Nota Obrigatória</Label>
                        <Textarea 
                          className="min-h-[60px] text-xs px-2 py-1" 
                          placeholder="Adicione observações..."
                          value={taskNotes[task.id] || ''}
                          onChange={(e) => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                        />
                      </div>
                    )}
                    <Button 
                      variant={isCompleted ? "outline" : "default"}
                      size="sm"
                      onClick={() => handleToggleStatus(task)}
                      disabled={loadingTaskId === task.id || (!isCompleted && !task.is_custom && (Array.isArray(task.playbook_tasks) ? task.playbook_tasks[0]?.is_note_required : task.playbook_tasks?.is_note_required) && (!taskNotes[task.id] || taskNotes[task.id].trim() === ''))}
                      className={cn(isCompleted && "text-muted-foreground hover:text-foreground", "w-full mt-auto")}
                    >
                      {loadingTaskId === task.id ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                      ) : isCompleted ? (
                        <>
                          <RefreshCcw className="w-3.5 h-3.5 mr-2" /> Reverter
                        </>
                      ) : (
                        <>
                          <CheckCircle2 className="w-3.5 h-3.5 mr-2" /> Concluir
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </Card>
            </div>
          )
        })}

        {/* Add Custom Task Row */}
        <div className="relative">
          <div className="absolute -left-[35px] bg-background rounded-full p-1 border border-dashed border-border text-muted-foreground">
            <Plus className="w-5 h-5" />
          </div>
          
          {!showAddCustom ? (
            <Button variant="outline" className="border-dashed" onClick={() => setShowAddCustom(true)}>
              Adicionar Tarefa Extra
            </Button>
          ) : (
            <Card className="p-4 rounded-2xl border-dashed border-primary/50 bg-primary/5">
              <div className="grid gap-4">
                <div className="grid gap-2">
                  <Label>Título da Tarefa</Label>
                  <Input 
                    value={customTitle} 
                    onChange={(e) => setCustomTitle(e.target.value)}
                    placeholder="Ex: Alinhamento com diretoria"
                  />
                </div>
                <div className="grid gap-2">
                  <Label>Dias úteis para conclusão (SLA)</Label>
                  <Input 
                    type="number" 
                    min={1} 
                    value={customDays} 
                    onChange={(e) => setCustomDays(parseInt(e.target.value))}
                  />
                </div>
                <div className="flex justify-end gap-2">
                  <Button variant="ghost" onClick={() => setShowAddCustom(false)}>Cancelar</Button>
                  <Button onClick={handleAddCustomTask} disabled={!customTitle || loadingTaskId === 'new-custom'}>
                    {loadingTaskId === 'new-custom' ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Adicionar'}
                  </Button>
                </div>
              </div>
            </Card>
          )}
        </div>

      </div>
    </div>
  )
}
