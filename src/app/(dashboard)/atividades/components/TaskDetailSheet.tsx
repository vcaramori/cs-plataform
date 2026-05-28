'use client'

import { useState, useEffect, useRef } from 'react'
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Calendar, Building2, Clock, AlertCircle, CheckCircle2, XCircle,
  Pencil, Send, Paperclip, Trash2, Download, Loader2, File, Image as ImageIcon,
} from 'lucide-react'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import type { CsmTask, CsmTaskStatus, CsmTaskPriority } from '@/lib/supabase/types'

interface Comment {
  id: string
  task_id: string
  user_id: string
  content: string
  created_at: string
  profiles?: { full_name: string | null; avatar_url: string | null } | null
}

interface Attachment {
  id: string
  task_id: string
  user_id: string
  file_name: string
  file_url: string
  file_size: number | null
  mime_type: string | null
  created_at: string
}

interface Props {
  task: CsmTask | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onEdit: (task: CsmTask) => void
  onStatusChange: (id: string, status: CsmTaskStatus) => void
}

const priorityConfig: Record<CsmTaskPriority, { label: string; color: string }> = {
  low:    { label: 'Baixa',  color: 'text-content-secondary' },
  medium: { label: 'Média',  color: 'text-amber-500' },
  high:   { label: 'Alta',   color: 'text-destructive' },
}

const statusConfig: Record<CsmTaskStatus, { label: string; icon: React.FC<{className?: string}>; color: string }> = {
  suggested:   { label: 'Sugestão',     icon: Clock,         color: 'text-accent' },
  todo:        { label: 'A Fazer',      icon: Clock,         color: 'text-content-secondary' },
  in_progress: { label: 'Em Andamento', icon: AlertCircle,   color: 'text-amber-500' },
  completed:   { label: 'Concluído',    icon: CheckCircle2,  color: 'text-success' },
  cancelled:   { label: 'Cancelado',    icon: XCircle,       color: 'text-content-secondary' },
}

const sourceLabelMap: Record<string, string> = {
  manual: 'Manual', adoption: 'Adoção', time_entry: 'Esforço', alert: 'Alerta', playbook: 'Playbook',
}

export function TaskDetailSheet({ task, open, onOpenChange, onEdit, onStatusChange }: Props) {
  const supabase = getSupabaseBrowserClient()
  const db = supabase as any

  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    if (!task || !open) return
    loadComments()
    loadAttachments()
  }, [task?.id, open])

  async function loadComments() {
    if (!task) return
    const { data } = await db
      .from('csm_task_comments')
      .select('*, profiles:user_id(full_name, avatar_url)')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })
    setComments((data as Comment[]) ?? [])
  }

  async function loadAttachments() {
    if (!task) return
    const { data } = await db
      .from('csm_task_attachments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: false })
    setAttachments((data as Attachment[]) ?? [])
  }

  async function handleSendComment() {
    if (!task || !newComment.trim()) return
    setSendingComment(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setSendingComment(false); return }

    const { data } = await db
      .from('csm_task_comments')
      .insert({ task_id: task.id, user_id: user.id, content: newComment.trim() })
      .select('*, profiles:user_id(full_name, avatar_url)')
      .single()

    if (data) {
      setComments(prev => [...prev, data as Comment])
      setNewComment('')
    }
    setSendingComment(false)
  }

  async function handleDeleteComment(id: string) {
    await db.from('csm_task_comments').delete().eq('id', id)
    setComments(prev => prev.filter(c => c.id !== id))
  }

  async function handleFileUpload(files: FileList | null) {
    if (!files || !task) return
    setUploadingFile(true)
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setUploadingFile(false); return }

    for (let i = 0; i < files.length; i++) {
      const file = files[i]
      const ext = file.name.split('.').pop()
      const path = `tasks/${task.id}/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`

      const { data: uploaded, error } = await supabase.storage
        .from('attachments')
        .upload(path, file)

      if (error) { console.error('Upload error:', error); continue }

      const { data: { publicUrl } } = supabase.storage.from('attachments').getPublicUrl(path)

      const { data: record } = await db
        .from('csm_task_attachments')
        .insert({
          task_id: task.id,
          user_id: user.id,
          file_name: file.name,
          file_url: publicUrl,
          file_size: file.size,
          mime_type: file.type || null,
        })
        .select('*')
        .single()

      if (record) setAttachments(prev => [record as Attachment, ...prev])
    }
    setUploadingFile(false)
  }

  async function handleDeleteAttachment(att: Attachment) {
    await db.from('csm_task_attachments').delete().eq('id', att.id)
    setAttachments(prev => prev.filter(a => a.id !== att.id))
  }

  function getFileIcon(name: string) {
    const ext = name.split('.').pop()?.toLowerCase() ?? ''
    if (['png','jpg','jpeg','gif','webp','svg'].includes(ext)) return <ImageIcon className="w-4 h-4 text-blue-400" />
    return <File className="w-4 h-4 text-content-secondary" />
  }

  function formatBytes(bytes: number | null) {
    if (!bytes) return ''
    if (bytes < 1024) return `${bytes} B`
    if (bytes < 1048576) return `${(bytes / 1024).toFixed(1)} KB`
    return `${(bytes / 1048576).toFixed(1)} MB`
  }

  if (!task) return null

  const status = statusConfig[task.status]
  const StatusIcon = status.icon
  const priority = priorityConfig[task.priority]
  const isOverdue = task.due_date && task.status !== 'completed' && task.status !== 'cancelled'
    && new Date(task.due_date) < new Date()

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-[480px] sm:max-w-[480px] flex flex-col gap-0 p-0 overflow-hidden">
        {/* Header */}
        <SheetHeader className="px-6 pt-6 pb-4 border-b border-border-divider flex-shrink-0">
          <div className="flex items-start justify-between gap-3">
            <div className="flex items-center gap-2 min-w-0">
              <StatusIcon className={cn('w-5 h-5 flex-shrink-0', status.color)} />
              <SheetTitle className="text-base font-bold leading-tight text-content-primary">
                {task.title}
              </SheetTitle>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="w-7 h-7 flex-shrink-0"
              onClick={() => { onOpenChange(false); onEdit(task) }}
            >
              <Pencil className="w-3.5 h-3.5" />
            </Button>
          </div>

          {/* Meta badges */}
          <div className="flex flex-wrap items-center gap-2 mt-2">
            <Badge variant="neutral" className={cn('text-[9px] font-black uppercase', priority.color)}>
              {priority.label}
            </Badge>
            <Badge variant="neutral" className={cn('text-[9px] font-black uppercase', status.color)}>
              {status.label}
            </Badge>
            {task.accounts?.name && (
              <span className="flex items-center gap-1 text-[10px] font-semibold text-content-secondary bg-muted/50 px-2 py-0.5 rounded-full">
                <Building2 className="w-3 h-3" />
                {task.accounts.name}
              </span>
            )}
            {task.due_date && (
              <span className={cn(
                'flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-full',
                isOverdue ? 'text-destructive bg-destructive/10' : 'text-content-secondary bg-muted/50'
              )}>
                <Calendar className="w-3 h-3" />
                {new Date(task.due_date + 'T00:00:00').toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                {isOverdue && ' — Atrasada'}
              </span>
            )}
            {task.source_label && task.source_label !== 'manual' && (
              <Badge variant="neutral" className="text-[9px] font-black uppercase text-accent border-accent/30">
                {sourceLabelMap[task.source_label] ?? task.source_label}
              </Badge>
            )}
          </div>
        </SheetHeader>

        {/* Tabs */}
        <Tabs defaultValue="details" className="flex flex-col flex-1 overflow-hidden">
          <TabsList className="mx-6 mt-4 flex-shrink-0">
            <TabsTrigger value="details" className="flex-1 text-xs">Detalhes</TabsTrigger>
            <TabsTrigger value="comments" className="flex-1 text-xs">
              Comentários {comments.length > 0 && `(${comments.length})`}
            </TabsTrigger>
            <TabsTrigger value="attachments" className="flex-1 text-xs">
              Anexos {attachments.length > 0 && `(${attachments.length})`}
            </TabsTrigger>
          </TabsList>

          {/* DETALHES */}
          <TabsContent value="details" className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-4">
            {task.description && (
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-1">Descrição</p>
                <p className="text-sm text-content-primary leading-relaxed whitespace-pre-wrap">{task.description}</p>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              {task.activity_type && (
                <div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-1">Tipo</p>
                  <p className="text-sm font-semibold text-content-primary capitalize">{task.activity_type.replace('_', ' ')}</p>
                </div>
              )}
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-1">Criada em</p>
                <p className="text-sm font-semibold text-content-primary">
                  {new Date(task.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short', year: 'numeric' })}
                </p>
              </div>
            </div>

            {/* Mudar status rápido */}
            <div>
              <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary mb-2">Mover para</p>
              <div className="flex flex-wrap gap-2">
                {(['todo','in_progress','completed','cancelled'] as CsmTaskStatus[])
                  .filter(s => s !== task.status)
                  .map(s => {
                    const cfg = statusConfig[s]
                    const Icon = cfg.icon
                    return (
                      <Button
                        key={s}
                        variant="outline"
                        size="sm"
                        className={cn('h-7 gap-1.5 text-[10px] font-black uppercase', cfg.color)}
                        onClick={() => { onStatusChange(task.id, s); onOpenChange(false) }}
                      >
                        <Icon className="w-3 h-3" />
                        {cfg.label}
                      </Button>
                    )
                  })}
              </div>
            </div>
          </TabsContent>

          {/* COMENTÁRIOS */}
          <TabsContent value="comments" className="flex-1 flex flex-col overflow-hidden mt-4">
            <div className="flex-1 overflow-y-auto px-6 space-y-3 pb-2">
              {comments.length === 0 && (
                <div className="flex flex-col items-center justify-center py-12 text-content-secondary/50">
                  <p className="text-sm font-semibold">Nenhum comentário ainda</p>
                  <p className="text-xs mt-1">Registre o que foi feito e o resultado.</p>
                </div>
              )}
              {comments.map(c => (
                <div key={c.id} className="group bg-muted/40 rounded-xl p-3 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="text-[10px] font-black text-content-primary">
                      {c.profiles?.full_name ?? 'Usuário'}
                    </span>
                    <div className="flex items-center gap-1">
                      <span className="text-[9px] text-content-secondary">
                        {new Date(c.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                        {' '}
                        {new Date(c.created_at).toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="w-5 h-5 opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive"
                        onClick={() => handleDeleteComment(c.id)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </div>
                  <p className="text-sm text-content-primary leading-relaxed whitespace-pre-wrap">{c.content}</p>
                </div>
              ))}
            </div>

            {/* Input de comentário */}
            <div className="px-6 pb-6 pt-2 flex-shrink-0 border-t border-border-divider mt-2">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Registre o que foi feito, resultado ou próximos passos..."
                  rows={3}
                  className="resize-none text-sm"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSendComment()
                  }}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 flex-shrink-0"
                  disabled={!newComment.trim() || sendingComment}
                  onClick={handleSendComment}
                >
                  {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[9px] text-content-secondary/50 mt-1">Ctrl+Enter para enviar</p>
            </div>
          </TabsContent>

          {/* ANEXOS */}
          <TabsContent value="attachments" className="flex-1 overflow-y-auto px-6 pb-6 mt-4 space-y-4">
            {/* Upload */}
            <div
              className="border-2 border-dashed border-border-divider rounded-xl p-4 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors"
              onClick={() => fileInputRef.current?.click()}
              onDragOver={e => e.preventDefault()}
              onDrop={e => { e.preventDefault(); handleFileUpload(e.dataTransfer.files) }}
            >
              <input
                ref={fileInputRef}
                type="file"
                multiple
                className="hidden"
                onChange={e => handleFileUpload(e.target.files)}
              />
              <div className="flex items-center justify-center gap-2">
                {uploadingFile
                  ? <Loader2 className="w-5 h-5 text-accent animate-spin" />
                  : <Paperclip className="w-5 h-5 text-content-secondary/50" />
                }
                <div className="text-left">
                  <p className="text-xs font-bold text-content-primary">
                    {uploadingFile ? 'Enviando...' : 'Clique ou arraste arquivos aqui'}
                  </p>
                  <p className="text-[9px] text-content-secondary uppercase tracking-widest mt-0.5">
                    Qualquer tipo de arquivo
                  </p>
                </div>
              </div>
            </div>

            {/* Lista de anexos */}
            {attachments.length === 0 && (
              <div className="text-center py-6 text-content-secondary/50">
                <p className="text-sm font-semibold">Nenhum anexo</p>
              </div>
            )}
            {attachments.map(att => (
              <div key={att.id} className="group flex items-center gap-3 bg-muted/40 rounded-xl px-3 py-2.5">
                {getFileIcon(att.file_name)}
                <div className="flex-1 min-w-0">
                  <p className="text-xs font-semibold text-content-primary truncate">{att.file_name}</p>
                  {att.file_size && (
                    <p className="text-[9px] text-content-secondary">{formatBytes(att.file_size)}</p>
                  )}
                </div>
                <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                  <Button variant="ghost" size="icon" className="w-6 h-6" asChild>
                    <a href={att.file_url} target="_blank" rel="noopener noreferrer" download={att.file_name}>
                      <Download className="w-3 h-3" />
                    </a>
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="w-6 h-6 text-destructive hover:text-destructive"
                    onClick={() => handleDeleteAttachment(att)}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </TabsContent>
        </Tabs>
      </SheetContent>
    </Sheet>
  )
}
