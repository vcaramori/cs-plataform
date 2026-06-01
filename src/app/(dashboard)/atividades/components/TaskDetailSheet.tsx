'use client'

import { useState, useEffect, useRef } from 'react'
import { Dialog, DialogContent, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import {
  Calendar, Building2, Clock, AlertCircle, CheckCircle2, XCircle,
  Pencil, Send, Paperclip, Trash2, Download, Loader2, File, Image as ImageIcon,
  MessageSquare,
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

function initials(name: string | null | undefined): string {
  if (!name) return 'U'
  const parts = name.trim().split(/\s+/)
  return ((parts[0]?.[0] ?? '') + (parts.length > 1 ? parts[parts.length - 1][0] : '')).toUpperCase() || 'U'
}

export function TaskDetailSheet({ task, open, onOpenChange, onEdit, onStatusChange }: Props) {
  const supabase = getSupabaseBrowserClient()
  const db = supabase

  const [comments, setComments] = useState<Comment[]>([])
  const [attachments, setAttachments] = useState<Attachment[]>([])
  const [newComment, setNewComment] = useState('')
  const [sendingComment, setSendingComment] = useState(false)
  const [uploadingFile, setUploadingFile] = useState(false)
  const [currentUserId, setCurrentUserId] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!task || !open) return
    loadComments()
    loadAttachments()
    supabase.auth.getUser().then(({ data }) => setCurrentUserId(data.user?.id ?? null))
  }, [task?.id, open])

  // Rola o chat para o fim quando chegam mensagens
  useEffect(() => {
    if (open) messagesEndRef.current?.scrollIntoView({ block: 'end' })
  }, [comments.length, open])

  async function loadComments() {
    if (!task) return
    const { data, error } = await db
      .from('csm_task_comments')
      .select('*')
      .eq('task_id', task.id)
      .order('created_at', { ascending: true })

    if (error) { console.error('Erro ao carregar comentários:', error); return }

    const rows = (data as Comment[]) ?? []
    setComments(await attachProfiles(rows))
  }

  /** Busca os perfis dos autores em uma query separada (a FK de user_id
   *  aponta para auth.users, então não dá pra embutir profiles via PostgREST). */
  async function attachProfiles(rows: Comment[]): Promise<Comment[]> {
    const ids = Array.from(new Set(rows.map(r => r.user_id)))
    if (ids.length === 0) return rows
    const { data: profiles } = await db
      .from('profiles')
      .select('id, full_name, avatar_url')
      .in('id', ids)
    const map = new Map<string, { full_name: string | null; avatar_url: string | null }>(
      (profiles ?? []).map((p: any) => [p.id, { full_name: p.full_name, avatar_url: p.avatar_url }])
    )
    return rows.map(r => ({ ...r, profiles: map.get(r.user_id) ?? null }))
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

    const { data, error } = await db
      .from('csm_task_comments')
      .insert({ task_id: task.id, user_id: user.id, content: newComment.trim() })
      .select('*')
      .single()

    if (error) {
      console.error('Erro ao enviar comentário:', error)
      alert('Não foi possível enviar o comentário: ' + (error.message ?? 'erro desconhecido'))
      setSendingComment(false)
      return
    }

    if (data) {
      const [withProfile] = await attachProfiles([data as Comment])
      setComments(prev => [...prev, withProfile])
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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        aria-describedby={undefined}
        className="max-w-4xl w-[95vw] p-0 gap-0 overflow-hidden flex flex-col h-[85vh] rounded-2xl"
      >
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-border-divider flex-shrink-0">
          <div className="flex items-start justify-between gap-3 pr-8">
            <div className="flex items-center gap-2 min-w-0">
              <StatusIcon className={cn('w-5 h-5 flex-shrink-0', status.color)} />
              <DialogTitle className="text-base font-bold leading-tight text-content-primary truncate">
                {task.title}
              </DialogTitle>
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
        </div>

        {/* Painel duplo: Detalhes/Anexos | Chat */}
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-[42%_58%] overflow-y-auto lg:overflow-hidden divide-y lg:divide-y-0 lg:divide-x divide-border-divider">

          {/* COLUNA ESQUERDA — Detalhes + Anexos */}
          <div className="lg:overflow-y-auto px-6 py-5 space-y-6">
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

            {/* Anexos */}
            <div className="space-y-3">
              <p className="text-[10px] font-black uppercase tracking-widest text-content-secondary">
                Anexos {attachments.length > 0 && `(${attachments.length})`}
              </p>
              <div
                className="border-2 border-dashed border-border-divider rounded-xl p-3 text-center cursor-pointer hover:border-accent/50 hover:bg-accent/5 transition-colors"
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
                    ? <Loader2 className="w-4 h-4 text-accent animate-spin" />
                    : <Paperclip className="w-4 h-4 text-content-secondary/50" />
                  }
                  <p className="text-xs font-semibold text-content-primary">
                    {uploadingFile ? 'Enviando...' : 'Clique ou arraste arquivos'}
                  </p>
                </div>
              </div>

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
            </div>
          </div>

          {/* COLUNA DIREITA — Chat de comentários */}
          <div className="flex flex-col min-h-0 bg-surface-background/30">
            <div className="px-5 py-3 border-b border-border-divider flex items-center gap-2 flex-shrink-0">
              <MessageSquare className="w-4 h-4 text-content-secondary" />
              <p className="text-[11px] font-black uppercase tracking-widest text-content-primary">
                Comentários {comments.length > 0 && `(${comments.length})`}
              </p>
            </div>

            {/* Mensagens */}
            <div className="flex-1 lg:overflow-y-auto px-4 py-4 space-y-4 min-h-[240px]">
              {comments.length === 0 && (
                <div className="flex flex-col items-center justify-center h-full py-12 text-content-secondary/50">
                  <MessageSquare className="w-8 h-8 mb-2 opacity-40" />
                  <p className="text-sm font-semibold">Nenhum comentário ainda</p>
                  <p className="text-xs mt-1">Registre o que foi feito, como num chat.</p>
                </div>
              )}
              {comments.map(c => {
                const mine = currentUserId != null && c.user_id === currentUserId
                const when = new Date(c.created_at)
                return (
                  <div key={c.id} className={cn('flex gap-2 group', mine ? 'flex-row-reverse' : 'flex-row')}>
                    <div className={cn(
                      'w-8 h-8 rounded-full flex items-center justify-center text-[10px] font-black flex-shrink-0',
                      mine ? 'bg-primary text-white' : 'bg-muted text-content-secondary'
                    )}>
                      {initials(c.profiles?.full_name)}
                    </div>
                    <div className={cn('max-w-[80%] min-w-0', mine ? 'items-end' : 'items-start', 'flex flex-col')}>
                      <div className={cn(
                        'flex items-center gap-2 mb-0.5 px-1',
                        mine ? 'flex-row-reverse' : 'flex-row'
                      )}>
                        <span className="text-[10px] font-black text-content-primary truncate">
                          {mine ? 'Você' : (c.profiles?.full_name ?? 'Usuário')}
                        </span>
                        <span className="text-[9px] text-content-secondary whitespace-nowrap">
                          {when.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                          {' · '}
                          {when.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                      </div>
                      <div className={cn(
                        'rounded-2xl px-3 py-2 text-sm leading-relaxed whitespace-pre-wrap break-words',
                        mine
                          ? 'bg-primary text-white rounded-tr-sm'
                          : 'bg-surface-card border border-border-divider text-content-primary rounded-tl-sm'
                      )}>
                        {c.content}
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="w-5 h-5 self-center opacity-0 group-hover:opacity-100 text-destructive hover:text-destructive flex-shrink-0"
                      onClick={() => handleDeleteComment(c.id)}
                    >
                      <Trash2 className="w-3 h-3" />
                    </Button>
                  </div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>

            {/* Composer */}
            <div className="px-4 pb-4 pt-2 flex-shrink-0 border-t border-border-divider">
              <div className="flex gap-2 items-end">
                <Textarea
                  value={newComment}
                  onChange={e => setNewComment(e.target.value)}
                  placeholder="Escreva uma mensagem..."
                  rows={2}
                  className="resize-none text-sm rounded-xl"
                  onKeyDown={e => {
                    if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendComment() }
                  }}
                />
                <Button
                  size="icon"
                  className="h-10 w-10 flex-shrink-0 rounded-xl"
                  disabled={!newComment.trim() || sendingComment}
                  onClick={handleSendComment}
                >
                  {sendingComment ? <Loader2 className="w-4 h-4 animate-spin" /> : <Send className="w-4 h-4" />}
                </Button>
              </div>
              <p className="text-[9px] text-content-secondary/50 mt-1">Enter para enviar · Shift+Enter para quebrar linha</p>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
