'use client'

import { useState } from 'react'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { cn } from '@/lib/utils'
import { CheckCircle2, Clock, Calendar, Mail, Search, Circle, RefreshCcw, Loader2, UserPlus } from 'lucide-react'
import { Textarea } from '@/components/ui/textarea'
import { togglePlaybookTaskStatus, reassignTask } from '@/app/(dashboard)/playbooks/actions'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'
import Link from 'next/link'

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
  account_playbooks?: {
    accounts: { id: string, name: string } | any
    playbook_templates: { name: string } | any
  } | any
  profiles?: { id: string, full_name: string, avatar_url: string } | any
}

interface CSM {
  id: string
  full_name: string
  role: string
}

export function CSOpsTasksClient({ initialTasks, isAdmin, csms, currentUserId }: { initialTasks: any[], isAdmin: boolean, csms: CSM[], currentUserId: string }) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [loadingTaskId, setLoadingTaskId] = useState<string | null>(null)
  const [taskNotes, setTaskNotes] = useState<Record<string, string>>({})
  const [assigningTaskId, setAssigningTaskId] = useState<string | null>(null)

  const handleToggleStatus = async (task: Task) => {
    setLoadingTaskId(task.id)
    try {
      const result = await togglePlaybookTaskStatus(task.id, task.status, task.account_playbook_id, taskNotes[task.id])
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Status atualizado")
        // Update local state to immediately remove it from the pending list
        setTasks(prev => prev.filter(t => t.id !== task.id))
      }
    } finally {
      setLoadingTaskId(null)
    }
  }

  const handleReassign = async (taskId: string, newCsmId: string, playbookId: string) => {
    setAssigningTaskId(taskId)
    try {
      const result = await reassignTask(taskId, newCsmId, playbookId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Tarefa reatribuída com sucesso")
        // Update local state
        setTasks(prev => prev.map(t => {
          if (t.id === taskId) {
            return { ...t, profiles: { ...t.profiles, id: newCsmId, full_name: csms.find(c => c.id === newCsmId)?.full_name } }
          }
          return t
        }))
      }
    } finally {
      setAssigningTaskId(null)
    }
  }

  const getTaskIcon = (type: string) => {
    switch (type) {
      case 'email': return <Mail className="w-5 h-5 text-warning" />
      case 'meeting': return <Calendar className="w-5 h-5 text-primary" />
      case 'review': return <Search className="w-5 h-5 text-indigo-500" />
      default: return <Circle className="w-5 h-5 text-muted-foreground" />
    }
  }

  const now = new Date()
  now.setHours(0, 0, 0, 0)

  const overdue: Task[] = []
  const today: Task[] = []
  const upcoming: Task[] = []

  tasks.forEach(task => {
    const due = new Date(task.due_date)
    due.setHours(0, 0, 0, 0)
    
    if (due < now) overdue.push(task)
    else if (due.getTime() === now.getTime()) today.push(task)
    else upcoming.push(task)
  })

  const renderTask = (task: Task, isOverdue: boolean) => {
    const isNoteRequired = !task.is_custom && (Array.isArray(task.playbook_tasks) ? task.playbook_tasks[0]?.is_note_required : task.playbook_tasks?.is_note_required)
    
    // Safely unwrap the account data depending on the Postgrest join return (array or object)
    const accountPlaybook = Array.isArray(task.account_playbooks) ? task.account_playbooks[0] : task.account_playbooks
    const account = Array.isArray(accountPlaybook?.accounts) ? accountPlaybook.accounts[0] : accountPlaybook?.accounts
    const template = Array.isArray(accountPlaybook?.playbook_templates) ? accountPlaybook.playbook_templates[0] : accountPlaybook?.playbook_templates

    return (
      <Card key={task.id} className={cn(
        "p-4 rounded-2xl shadow-sm border transition-colors",
        "hover:border-primary/50",
        isOverdue && "border-destructive/30 bg-destructive/5"
      )}>
        <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
          <div className="flex gap-4">
            <div className={cn(
              "mt-1 p-2 rounded-xl bg-background border shadow-sm shrink-0",
              isOverdue ? "border-destructive text-destructive" : "border-border text-primary"
            )}>
              {getTaskIcon(task.task_type)}
            </div>
            
            <div>
              <div className="flex flex-wrap items-center gap-2 mb-1">
                <h4 className="font-semibold text-content-primary">
                  {task.title}
                </h4>
                {task.is_custom && (
                  <Badge variant="outline" className="text-[10px] h-5 px-1.5 bg-accent">Custom</Badge>
                )}
                {isOverdue && (
                  <Badge variant="destructive" className="text-[10px] h-5 px-1.5">Atrasado</Badge>
                )}
              </div>
              
              <div className="flex items-center gap-2 text-sm text-muted-foreground mb-3">
                <span className="font-medium text-foreground">
                  <Link href={`/accounts/${account?.id}`} className="hover:underline">
                    {account?.name || 'Conta Desconhecida'}
                  </Link>
                </span>
                <span>•</span>
                <span>{template?.name || 'Playbook'}</span>
              </div>

              {task.description && (
                <p className="text-sm text-muted-foreground mb-3">{task.description}</p>
              )}
              
              <div className="flex flex-wrap items-center gap-4 text-xs font-medium mt-1">
                <div className="flex items-center gap-1.5">
                  <Clock className={cn("w-3.5 h-3.5", isOverdue ? "text-destructive" : "text-muted-foreground")} />
                  <span className={cn(isOverdue && "text-destructive")}>
                    Prazo: {format(new Date(task.due_date), "dd 'de' MMM, HH:mm", { locale: ptBR })}
                  </span>
                </div>
                
                <div className="flex items-center gap-1.5 border-l border-border/50 pl-4">
                  <span className="text-muted-foreground">Responsável:</span>
                  {isAdmin && task.profiles?.id ? (
                    <Select 
                      disabled={assigningTaskId === task.id}
                      value={task.profiles.id} 
                      onValueChange={(val) => handleReassign(task.id, val, task.account_playbook_id)}
                    >
                      <SelectTrigger className="h-6 text-xs px-2 py-0 border-none bg-surface-background w-auto font-bold">
                        <SelectValue placeholder="Selecione..." />
                      </SelectTrigger>
                      <SelectContent>
                        {csms.map(csm => (
                          <SelectItem key={csm.id} value={csm.id}>{csm.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <span className="font-bold text-content-primary">{task.profiles?.full_name || 'Não Atribuído'}</span>
                  )}
                  {assigningTaskId === task.id && <Loader2 className="w-3 h-3 animate-spin text-muted-foreground" />}
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-2 shrink-0 md:min-w-[180px]">
            {isNoteRequired && (
              <div className="flex flex-col gap-1">
                <span className="text-[10px] uppercase font-bold text-muted-foreground tracking-widest">Nota Obrigatória</span>
                <Textarea 
                  className="min-h-[60px] text-xs px-2 py-1" 
                  placeholder="Adicione observações..."
                  value={taskNotes[task.id] || ''}
                  onChange={(e) => setTaskNotes(prev => ({ ...prev, [task.id]: e.target.value }))}
                />
              </div>
            )}
            <Button 
              size="sm"
              onClick={() => handleToggleStatus(task)}
              disabled={loadingTaskId === task.id || (isNoteRequired && (!taskNotes[task.id] || taskNotes[task.id].trim() === ''))}
              className="w-full mt-auto"
            >
              {loadingTaskId === task.id ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4 mr-2" /> Concluir
                </>
              )}
            </Button>
          </div>
        </div>
      </Card>
    )
  }

  if (tasks.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center opacity-60">
        <CheckCircle2 className="w-12 h-12 text-success mb-4" />
        <h2 className="text-xl font-bold mb-2">Tudo em dia!</h2>
        <p className="text-muted-foreground">Não há tarefas pendentes de playbooks na sua fila.</p>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      {overdue.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-destructive flex items-center gap-2 border-b border-border/50 pb-2">
            Em Atraso <Badge variant="destructive" className="rounded-full ml-2">{overdue.length}</Badge>
          </h2>
          <div className="grid gap-4">
            {overdue.map(t => renderTask(t, true))}
          </div>
        </div>
      )}

      {today.length > 0 && (
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-foreground flex items-center gap-2 border-b border-border/50 pb-2">
            Hoje / Pendentes <Badge variant="secondary" className="rounded-full ml-2">{today.length}</Badge>
          </h2>
          <div className="grid gap-4">
            {today.map(t => renderTask(t, false))}
          </div>
        </div>
      )}

      {upcoming.length > 0 && (
        <div className="space-y-4 opacity-80">
          <h2 className="text-lg font-bold text-muted-foreground flex items-center gap-2 border-b border-border/50 pb-2">
            Futuras <Badge variant="outline" className="rounded-full ml-2">{upcoming.length}</Badge>
          </h2>
          <div className="grid gap-4">
            {upcoming.map(t => renderTask(t, false))}
          </div>
        </div>
      )}
    </div>
  )
}
