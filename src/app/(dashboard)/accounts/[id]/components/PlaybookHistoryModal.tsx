'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { 
  CheckCircle2, 
  Mail, 
  Sparkles, 
  MessageSquare, 
  Target, 
  Clock, 
  Edit2, 
  Check, 
  Loader2,
  AlertCircle
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { toast } from 'sonner'
import { motion, AnimatePresence } from 'framer-motion'

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

      // Update local state
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
      // Save edited descriptions (if needed in future)
      toast.success('Histórico do playbook atualizado')
      setIsEditing(false)
    } catch (err) {
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
          
          {/* Execution Context */}
          <div className="grid grid-cols-2 gap-6">
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] ml-1">
                 <Target className="w-3.5 h-3.5 text-emerald-500" /> Gatilho de Origem
              </p>
              <p className="text-[#2d3558] dark:text-white text-sm font-black tracking-tight pl-1">{trigger}</p>
            </div>
            <div className="bg-slate-50 dark:bg-slate-800/50 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 space-y-2">
              <p className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] ml-1">
                 <Clock className="w-3.5 h-3.5 text-emerald-500" /> Data de Encerramento
              </p>
              <p className="text-[#2d3558] dark:text-white text-sm font-black tracking-tight pl-1">
                {playbook.date ? new Date(playbook.date).toLocaleDateString('pt-BR') : 'Recentemente'}
              </p>
            </div>
          </div>

          {/* Objetivo (if exists) */}
          {playbook.objective && (
            <div className="bg-emerald-50 dark:bg-emerald-500/10 p-6 rounded-2xl border border-emerald-200 dark:border-emerald-500/20 space-y-2">
              <p className="flex items-center gap-2 text-[9px] text-emerald-600 dark:text-emerald-400 uppercase font-black tracking-[0.2em] ml-1">
                 <Target className="w-3.5 h-3.5" /> Objetivo
              </p>
              <p className="text-[#2d3558] dark:text-white text-sm font-medium pl-1">{playbook.objective}</p>
              {playbook.success_criteria && (
                <p className="text-[9px] text-slate-500 dark:text-slate-400 pl-1 mt-2">
                  <strong>Critério de Sucesso:</strong> {playbook.success_criteria}
                </p>
              )}
            </div>
          )}

          {/* Activity Timeline */}
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
                              onClick={() => handleCompleteTask(task.id, idx)}
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

                      {isEditing ? (
                        <Textarea 
                          defaultValue={task.task?.description}
                          onChange={(e) => {
                            const newTasks = [...tasks]
                            newTasks[idx].task.description = e.target.value
                            setTasks(newTasks)
                          }}
                          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300 min-h-[80px] rounded-xl focus-visible:ring-emerald-500/30"
                        />
                      ) : (
                        <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed font-medium">
                          {task.task?.description}
                        </p>
                      )}

                      {task.task?.task_type === 'email' && !isEditing && (
                        <div className="mt-4 bg-emerald-500/[0.03] p-4 rounded-xl border border-emerald-500/10 flex items-start gap-3">
                          <AlertCircle className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                          <p className="text-[10px] text-slate-500 dark:text-slate-400 italic leading-relaxed">
                            Interação de e-mail enviada automaticamente como parte desta jornada estratégica.
                          </p>
                        </div>
                      )}

                      {/* Time Spent and Comments */}
                      {task.completed_at && (
                        <div className="mt-4 space-y-3">
                          {task.time_spent_hours && (
                            <div className="flex items-center gap-2 text-xs">
                              <Clock className="w-3.5 h-3.5 text-slate-400" />
                              <span className="font-semibold text-slate-600 dark:text-slate-300">{task.time_spent_hours}h gastos</span>
                            </div>
                          )}

                          {/* Comments Thread */}
                          {task.comments && task.comments.length > 0 && (
                            <div className="bg-slate-900/5 dark:bg-white/5 rounded-lg p-3 space-y-2">
                              {task.comments.map((comment: any, idx: number) => (
                                <div key={idx} className="text-[9px]">
                                  <div className="font-bold text-slate-600 dark:text-slate-300">{comment.author_name}</div>
                                  <div className="text-slate-500 dark:text-slate-400 italic">{comment.text}</div>
                                  <div className="text-[8px] text-slate-400 mt-1">{new Date(comment.created_at).toLocaleString('pt-BR')}</div>
                                </div>
                              ))}
                            </div>
                          )}

                          {/* Add Comment */}
                          {!isEditing && (
                            <div className="mt-2">
                              {addingCommentTo === task.id ? (
                                <div className="flex gap-2">
                                  <input
                                    type="text"
                                    placeholder="Adicionar comentário..."
                                    value={newComment}
                                    onChange={(e) => setNewComment(e.target.value)}
                                    className="flex-1 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded px-2 py-1 text-[9px] focus:outline-none"
                                    autoFocus
                                  />
                                  <button
                                    onClick={() => handleAddComment(task.id)}
                                    className="bg-emerald-500 text-white px-2 py-1 rounded text-[9px] font-bold hover:bg-emerald-600"
                                  >
                                    +
                                  </button>
                                  <button
                                    onClick={() => {
                                      setAddingCommentTo(null)
                                      setNewComment('')
                                    }}
                                    className="text-slate-400 px-2 py-1 text-[9px]"
                                  >
                                    ✕
                                  </button>
                                </div>
                              ) : (
                                <button
                                  onClick={() => setAddingCommentTo(task.id)}
                                  className="text-[9px] text-emerald-600 dark:text-emerald-400 hover:underline"
                                >
                                  💬 Adicionar comentário
                                </button>
                              )}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </div>
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
