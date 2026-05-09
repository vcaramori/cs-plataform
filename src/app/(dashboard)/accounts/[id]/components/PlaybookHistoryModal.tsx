'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Sparkles, Edit2, Loader2, Check } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { toast } from 'sonner'
import { PlaybookHistoryDetails } from './PlaybookHistoryDetails'
import { PlaybookHistoryList } from './PlaybookHistoryList'

interface PlaybookHistoryModalProps {
  playbook: any | null
  onOpenChange: (open: boolean) => void
  onTaskComplete?: () => void
}

export function PlaybookHistoryModal({ playbook, onOpenChange, onTaskComplete }: PlaybookHistoryModalProps) {
  const [isEditing, setIsEditing] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [updatingTaskId, setUpdatingTaskId] = useState<string | null>(null)
  const [tasks, setTasks] = useState<any[]>([])
  const [newComment, setNewComment] = useState<string>('')
  const [addingCommentTo, setAddingCommentTo] = useState<string | null>(null)

  useEffect(() => {
    if (playbook) {
      setTasks(playbook.tasks || [])
      setIsEditing(false)
    }
  }, [playbook])

  if (!playbook) return null

  const handleCompleteTask = async (taskId: string, taskIndex: number) => {
    setUpdatingTaskId(taskId)
    try {
      const res = await fetch(
        `/api/account-playbooks/${playbook.id}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ status: 'completed' }),
        }
      )

      if (!res.ok) {
        throw new Error('Failed to update task')
      }

      const updatedTask = await res.json()
      const newTasks = [...tasks]
      newTasks[taskIndex] = updatedTask
      setTasks(newTasks)

      toast.success('Task concluída com sucesso')
      onTaskComplete?.()
    } catch (err) {
      console.error('Error updating task:', err)
      toast.error('Erro ao atualizar task')
    } finally {
      setUpdatingTaskId(null)
    }
  }

  const handleSave = async () => {
    setIsSaving(true)
    try {
      toast.success('Histórico do playbook atualizado')
      setIsEditing(false)
    } catch (err) {
      console.error('Error saving:', err)
      toast.error('Erro ao salvar alterações')
    } finally {
      setIsSaving(false)
    }
  }

  const handleAddComment = async (taskId: string) => {
    if (!newComment.trim()) return
    try {
      const res = await fetch(
        `/api/account-playbooks/${playbook.id}/tasks/${taskId}`,
        {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ comment: newComment }),
        }
      )

      if (!res.ok) throw new Error('Failed to add comment')

      const updatedTask = await res.json()
      const taskIndex = tasks.findIndex((t) => t.id === taskId)
      if (taskIndex >= 0) {
        const newTasks = [...tasks]
        newTasks[taskIndex] = updatedTask
        setTasks(newTasks)
      }

      setNewComment('')
      setAddingCommentTo(null)
      toast.success('Comentário adicionado')
    } catch (err) {
      console.error('Error adding comment:', err)
      toast.error('Erro ao adicionar comentário')
    }
  }

  const trigger = playbook.template?.name || 'Jornada de Sucesso'

  return (
    <Dialog open={!!playbook} onOpenChange={onOpenChange}>
      <DialogContent aria-describedby={undefined} className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white max-w-2xl p-0 overflow-hidden rounded-2xl shadow-2xl">

        {/* Header Area with Glow */}
        <div className="relative h-28 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center px-10 justify-between">
          <div className="absolute inset-0 bg-emerald-500/5 blur-3xl rounded-full opacity-50 pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-14 h-14 rounded-2xl bg-emerald-50 dark:bg-emerald-500/10 border border-emerald-200 dark:border-emerald-500/20 flex items-center justify-center shadow-sm">
              <Sparkles className="w-8 h-8 text-emerald-500" />
            </div>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <DialogTitle className="text-xl font-black uppercase tracking-tighter leading-none text-[#2d3558] dark:text-white">
                  Histórico do Playbook
                </DialogTitle>
                <Badge className="bg-emerald-500/10 text-emerald-500 border-emerald-500/20 text-[9px] font-black uppercase tracking-widest px-2">Finalizado</Badge>
              </div>
              <DialogDescription className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
                {trigger}
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {!isEditing ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="bg-emerald-500/10 border-emerald-500/20 text-emerald-600 dark:text-emerald-400 hover:bg-emerald-500 hover:text-white font-black uppercase tracking-widest text-[10px] h-9 gap-2"
              >
                <Edit2 className="w-3.5 h-3.5" /> Ajustar Checklist
              </Button>
            ) : (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setIsEditing(false)}
                className="text-slate-500 font-black uppercase tracking-widest text-[10px]"
              >
                Cancelar
              </Button>
            )}
          </div>
        </div>

        <div className="p-10 space-y-10 max-h-[65vh] overflow-y-auto custom-scrollbar">
          <PlaybookHistoryDetails playbook={playbook} />

          <PlaybookHistoryList
            tasks={tasks}
            isEditing={isEditing}
            updatingTaskId={updatingTaskId}
            onCompleteTask={handleCompleteTask}
            onEditTask={() => {}}
          />
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex items-center justify-between">
          <div />

          {isEditing ? (
            <Button
              onClick={handleSave}
              disabled={isSaving}
              className="bg-emerald-500 hover:bg-emerald-600 text-white font-black uppercase tracking-[0.2em] h-11 px-10 shadow-xl shadow-emerald-500/20 gap-3 group rounded-xl transition-all"
            >
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 group-hover:scale-125 transition-transform" />}
              Salvar Ajustes
            </Button>
          ) : (
            <Button
              variant="outline"
              onClick={() => onOpenChange(false)}
              className="rounded-xl px-8 h-11 text-[10px] font-black uppercase tracking-widest bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white hover:bg-slate-100 dark:hover:bg-slate-800 shadow-sm"
            >
              Fechar Histórico
            </Button>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
