'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Edit2, 
  History, 
  Target, 
  Activity, 
  Trash2,
  Loader2,
  Check,
  FileText,
  Paperclip,
  X
} from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '@/lib/utils'

const interactionTypes: Record<string, string> = {
  meeting: 'Reunião',
  email: 'E-mail',
  qbr: 'QBR',
  onboarding: 'Onboarding',
  'health-check': 'Health Check',
  expansion: 'Expansão',
  'churn-risk': 'Risco de Churn'
}

import { RawTextViewer } from '@/components/shared/RawTextViewer'
import { AttachmentsGallery } from '@/components/shared/AttachmentsGallery'
import { AttachmentsUploader } from '@/components/shared/AttachmentsUploader'

interface Interaction {
  id: string
  account_id: string
  type: string
  title: string
  date: string
  raw_transcript: string | null
  direct_hours?: number
  metadata?: {
    operation_context?: string
    original_insight?: string
  }
  file_urls?: string[] | null
}

interface Props {
  interaction: Interaction | null
  onClose: () => void
  onUpdate: (updated: Interaction) => void
  accountName?: string
}

interface DeletionPreview {
  interactions: number
  wishlistSignals: number
  embeddings: number
  suggestedTasks: number
  keptTasks: number
  onboardingEvents: number
}

export function InteractionDetailModal({ interaction, onClose, onUpdate, accountName }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Interaction>>({})
  const [isSaving, setIsSaving] = useState(false)
  const [deletePreview, setDeletePreview] = useState<DeletionPreview | null>(null)
  const [loadingPreview, setLoadingPreview] = useState(false)

  useEffect(() => {
    if (interaction) {
      setEditForm({
        type: interaction.type,
        title: interaction.title,
        date: interaction.date,
        raw_transcript: interaction.raw_transcript,
        file_urls: interaction.file_urls ?? []
      })
      setIsEditing(false)
    }
  }, [interaction])

  const handleSave = async () => {
    if (!interaction || isSaving) return
    setIsSaving(true)
    try {
      const resp = await fetch(`/api/interactions/${interaction.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!resp.ok) throw new Error('Falha ao salvar')
      const updated = await resp.json()
      onUpdate(updated)
      setIsEditing(false)
      toast.success('Interação atualizada com sucesso')
    } catch (err) {
      toast.error('Erro ao processar alteração')
    } finally {
      setIsSaving(false)
    }
  }

  // Passo 1: busca o raio de impacto e abre o diálogo de confirmação.
  const requestDelete = async () => {
    if (!interaction) return
    setLoadingPreview(true)
    try {
      const resp = await fetch(`/api/interactions/${interaction.id}/deletion-preview`)
      if (!resp.ok) throw new Error()
      setDeletePreview(await resp.json())
    } catch {
      setDeletePreview({ interactions: 1, wishlistSignals: 0, embeddings: 0, suggestedTasks: 0, keptTasks: 0, onboardingEvents: 0 })
    } finally {
      setLoadingPreview(false)
    }
  }

  // Passo 2: confirma e exclui em cascata.
  const confirmDelete = async () => {
    if (!interaction || isSaving) return
    setIsSaving(true)
    try {
       const resp = await fetch(`/api/interactions/${interaction.id}`, { method: 'DELETE' })
       if (!resp.ok) throw new Error()
       toast.success('Registro e dados vinculados removidos')
       setDeletePreview(null)
       onClose()
    } catch (err) {
       console.error('[InteractionDetailModal] Delete error:', err)
       toast.error('Erro ao deletar')
    } finally {
       setIsSaving(false)
    }
  }

  return (
    <>
    <Dialog open={!!interaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 shadow-2xl text-foreground dark:text-white max-w-2xl overflow-hidden p-0 rounded-2xl">
        
        {/* Header Area */}
        <div className="relative h-16 bg-surface-background dark:bg-slate-800/50 border-b border-border-divider dark:border-slate-800 flex items-center px-6 justify-between">

           <div className="flex items-center gap-3 relative z-10">
              <div className="w-9 h-9 rounded-xl bg-plannera-orange/10 border border-plannera-orange/20 flex items-center justify-center">
                 <Users className="w-4.5 h-4.5 text-plannera-orange" />
              </div>
              <div>
                 <DialogTitle className="text-base font-black uppercase tracking-tighter leading-none mb-0.5 text-foreground dark:text-white">
                   {isEditing ? 'Editar Interação' : 'Detalhes da Interação'}
                 </DialogTitle>
                 <DialogDescription className="text-content-secondary dark:text-content-secondary text-[8px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
                    Estratégia e Relacionamento
                 </DialogDescription>
              </div>
           </div>

            <div className="flex items-center gap-3 relative z-10 mr-10">
              {!isEditing && (
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setIsEditing(true)}
                   className="bg-plannera-orange/10 border-plannera-orange/20 text-plannera-orange hover:bg-plannera-orange hover:text-white font-black uppercase tracking-widest text-[10px] h-9 gap-2 shadow-lg px-4 rounded-xl"
                >
                   <Edit2 className="w-3.5 h-3.5" /> Editar Log
                </Button>
              )}
              {isEditing && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setIsEditing(false)}
                   className="text-content-secondary dark:text-content-secondary hover:text-foreground dark:hover:text-white hover:bg-surface-card dark:hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] h-9 px-4 rounded-xl"
                 >
                    Cancelar
                 </Button>
              )}
           </div>
        </div>

         <div className="p-6 space-y-5 max-h-[72vh] overflow-y-auto custom-scrollbar">
          {interaction && (
            <AnimatePresence mode="wait">
              <motion.div 
                key={isEditing ? 'edit' : 'view'}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-5"
              >
                {/* Information Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 bg-surface-background/30 dark:bg-slate-800/20 p-3.5 rounded-xl border border-border-divider/50 dark:border-slate-800/40 shadow-sm">
                  
                  {/* Account Name */}
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-[8px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-widest ml-0.5">
                       <Target className="w-3 h-3 text-plannera-orange" /> LOGO Vinculado
                    </p>
                    <p className="text-xs font-black text-foreground dark:text-white uppercase tracking-tight pl-0.5 truncate" title={accountName || '—'}>{accountName || '—'}</p>
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-[8px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-widest ml-0.5">
                       <History className="w-3 h-3 text-plannera-orange" /> Realizado em
                    </p>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editForm.date || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-foreground dark:text-white h-8.5 text-xs font-black uppercase rounded-lg shadow-sm"
                      />
                    ) : (
                      <p className="text-xs font-black text-foreground dark:text-white uppercase tracking-tight pl-0.5">
                        {format(new Date(interaction.date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>

                  {/* Activity Type */}
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-[8px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-widest ml-0.5">
                       <Activity className="w-3 h-3 text-plannera-orange" /> Tipo Interação
                    </p>
                    {isEditing ? (
                      <Select
                        value={editForm.type}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, type: val }))}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-8.5 text-[10px] font-black uppercase tracking-widest text-plannera-orange rounded-lg shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-foreground dark:text-white">
                          {Object.entries(interactionTypes).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="uppercase text-[9px] font-black hover:bg-surface-background dark:hover:bg-slate-800 focus:bg-surface-background dark:focus:bg-slate-800 focus:text-foreground dark:focus:text-white cursor-pointer transition-colors">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex">
                         <Badge className="bg-plannera-orange/10 text-plannera-orange border border-plannera-orange/20 px-2 py-0.5 font-black uppercase tracking-widest text-[8px] rounded-full shadow-sm">
                           {interactionTypes[interaction.type] || interaction.type}
                         </Badge>
                      </div>
                    )}
                  </div>

                  {/* Title (Contact/Subject) */}
                  <div className="space-y-1">
                    <p className="flex items-center gap-1.5 text-[8px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-widest ml-0.5">
                       <FileText className="w-3 h-3 text-plannera-orange" /> Título / Contato
                    </p>
                    {isEditing ? (
                      <Input
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-foreground dark:text-white h-8.5 text-xs font-bold rounded-lg shadow-sm"
                        placeholder="Nome do contato ou assunto"
                      />
                    ) : (
                      <p className="text-xs font-black text-foreground dark:text-white tracking-tight pl-0.5 truncate" title={interaction.title || '—'}>
                        {interaction.title || '—'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Checklist / Transcript Textarea */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-0.5">
                     <Activity className="w-4 h-4 text-plannera-orange" />
                     <p className="text-[10px] text-foreground dark:text-white uppercase font-black tracking-widest">Apontamentos & Checklist Validado</p>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={editForm.raw_transcript || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, raw_transcript: e.target.value }))}
                      className="bg-surface-background dark:bg-slate-800/50 border-border-divider dark:border-slate-800 text-foreground dark:text-white min-h-[140px] text-sm font-bold tracking-tight rounded-xl p-5 focus-visible:ring-plannera-orange/30 shadow-inner"
                      placeholder="Descreva detalhadamente o que foi conversado ou o checklist realizado..."
                    />
                  ) : (
                    <div className="bg-surface-background dark:bg-slate-800/50 p-5 rounded-xl border border-border-divider dark:border-slate-800 text-foreground dark:text-white text-sm font-medium tracking-tight leading-relaxed shadow-inner whitespace-pre-wrap">
                      {interaction.raw_transcript || "Nenhum apontamento ou checklist registrado."}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-3 pt-3 border-t border-border-divider dark:border-slate-800/50">
                    <div className="space-y-2">
                      <p className="text-[10px] uppercase font-black tracking-widest text-foreground dark:text-white ml-0.5">Mídias Anexadas</p>
                      {editForm.file_urls && editForm.file_urls.length > 0 && (
                        <AttachmentsGallery urls={editForm.file_urls} />
                      )}
                      <AttachmentsUploader 
                        onUploadComplete={(urls) => setEditForm(prev => ({ ...prev, file_urls: [...(prev.file_urls || []), ...urls] }))} 
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div className="pt-3 border-t border-border-divider dark:border-slate-800/50">
                      <h4 className="text-[10px] font-black uppercase tracking-widest text-content-secondary dark:text-content-secondary/80 flex items-center gap-1.5 mb-2">
                        <Paperclip className="w-3.5 h-3.5 text-plannera-orange" /> Anexos / Mídias
                      </h4>
                      {interaction.file_urls && interaction.file_urls.length > 0 ? (
                        <AttachmentsGallery urls={interaction.file_urls} />
                      ) : (
                        <p className="text-xs text-content-secondary/50 italic pl-5">
                          Nenhum arquivo anexado a este registro.
                        </p>
                      )}
                    </div>
                    {interaction.raw_transcript && (
                      <div className="pt-3 border-t border-border-divider dark:border-slate-800/50">
                        <RawTextViewer 
                          text={interaction.raw_transcript} 
                          title="Transcrição Bruta / Texto Original" 
                          filename={`transcricao-interacao-${interaction.id}.txt`} 
                        />
                      </div>
                    )}
                  </>
                )}

                {/* AI Insights Area */}
                {interaction.metadata && (isEditing || interaction.metadata.operation_context) && (
                  <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 ml-0.5">
                         <div className="w-6 h-6 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Activity className="w-3.5 h-3.5 text-indigo-500" />
                         </div>
                         <p className="text-[10px] text-foreground dark:text-white uppercase font-black tracking-widest">Contexto Operacional</p>
                      </div>
                      <div className="bg-surface-background dark:bg-slate-800 p-5 rounded-xl border border-border-divider dark:border-slate-800 text-content-secondary dark:text-content-secondary text-xs font-medium leading-relaxed shadow-sm">
                        {interaction.metadata.operation_context || "Sem contexto adicional mapeado pela I.A."}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-4 px-6 border-t border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50 rounded-b-2xl flex items-center justify-between">
            {interaction && !isEditing ? (
               <Button
                 variant="ghost"
                 onClick={requestDelete}
                 disabled={loadingPreview}
                 className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 font-black uppercase tracking-widest text-[10px] gap-2 h-10 px-5 rounded-xl transition-all"
               >
                  {loadingPreview ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Trash2 className="w-4.5 h-4.5" />} Remover Registro
               </Button>
            ) : <div />}

            {isEditing && (
               <div className="flex gap-4">
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-[0.2em] h-10 px-6 shadow-xl shadow-plannera-orange/20 gap-3 group rounded-xl active:scale-[0.98] transition-all"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 group-hover:scale-125 transition-transform" />}
                    Salvar Alterações
                  </Button>
               </div>
            )}
        </div>

      </DialogContent>
    </Dialog>

      {/* Confirmação de exclusão — lista o raio de impacto antes de apagar */}
      <Dialog open={!!deletePreview} onOpenChange={(open) => !open && !isSaving && setDeletePreview(null)}>
        <DialogContent className="bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 shadow-2xl text-foreground dark:text-white max-w-md rounded-2xl">
          <DialogTitle className="text-base font-black uppercase tracking-tighter flex items-center gap-2 text-destructive">
            <Trash2 className="w-4.5 h-4.5" /> Excluir esta interação?
          </DialogTitle>
          <DialogDescription className="text-content-secondary text-xs font-medium">
            Esta ação é permanente. Para manter os dados consistentes, serão removidos junto:
          </DialogDescription>

          {deletePreview && (() => {
            const items: string[] = []
            if (deletePreview.interactions > 0) items.push(`${deletePreview.interactions} interação(ões) / esforço espelho`)
            if (deletePreview.wishlistSignals > 0) items.push(`${deletePreview.wishlistSignals} item(ns) de wishlist`)
            if (deletePreview.embeddings > 0) items.push(`${deletePreview.embeddings} trecho(s) da memória da IA (RAG)`)
            if (deletePreview.suggestedTasks > 0) items.push(`${deletePreview.suggestedTasks} tarefa(s) sugerida(s) pendente(s)`)
            return (
              <div className="space-y-3 py-1">
                {items.length > 0 ? (
                  <ul className="space-y-1.5">
                    {items.map((t, i) => (
                      <li key={i} className="flex items-start gap-2 text-sm font-bold text-foreground dark:text-white">
                        <X className="w-3.5 h-3.5 mt-1 text-destructive shrink-0" /> {t}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-content-secondary italic">Nenhum dado derivado vinculado.</p>
                )}
                {(deletePreview.keptTasks > 0 || deletePreview.onboardingEvents > 0) && (
                  <p className="text-[11px] text-content-secondary/80 leading-relaxed border-t border-border-divider pt-2">
                    {deletePreview.keptTasks > 0 && `${deletePreview.keptTasks} tarefa(s) já iniciada(s)/concluída(s) serão preservadas (apenas desvinculadas). `}
                    {deletePreview.onboardingEvents > 0 && `${deletePreview.onboardingEvents} evento(s) de onboarding serão preservados.`}
                  </p>
                )}
              </div>
            )
          })()}

          <div className="flex items-center justify-end gap-3 pt-2">
            <Button variant="ghost" onClick={() => setDeletePreview(null)} disabled={isSaving} className="font-black uppercase tracking-widest text-[10px] h-10 px-5 rounded-xl">
              Cancelar
            </Button>
            <Button onClick={confirmDelete} disabled={isSaving} className="bg-destructive hover:bg-destructive/90 text-white font-black uppercase tracking-widest text-[10px] h-10 px-5 rounded-xl gap-2">
              {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />} Confirmar exclusão
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}
