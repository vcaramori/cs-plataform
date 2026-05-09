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
  FileText
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
}

interface Props {
  interaction: Interaction | null
  onClose: () => void
  onUpdate: (updated: Interaction) => void
  accountName?: string
}

export function InteractionDetailModal({ interaction, onClose, onUpdate, accountName }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Interaction>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (interaction) {
      setEditForm({
        type: interaction.type,
        title: interaction.title,
        date: interaction.date,
        raw_transcript: interaction.raw_transcript,
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

  const handleDelete = async () => {
    if (!interaction || !confirm(`Deseja realmente excluir este registro? Esta ação é irreversível.`)) return
    setIsSaving(true)
    try {
       const resp = await fetch(`/api/interactions/${interaction.id}`, { method: 'DELETE' })
       if (!resp.ok) throw new Error()
       toast.success('Registro removido')
       onClose()
    } catch (err) {
       console.error('[InteractionDetailModal] Delete error:', err)
       toast.error('Erro ao deletar')
    } finally {
       setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!interaction} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 shadow-2xl text-[#2d3558] dark:text-white max-w-2xl overflow-hidden p-0 rounded-2xl">
        
        {/* Header Area */}
        <div className="relative h-24 bg-surface-background dark:bg-slate-800/50 border-b border-border-divider dark:border-slate-800 flex items-center px-10 justify-between">
           <div className="absolute inset-0 bg-plannera-orange/5 blur-3xl rounded-full opacity-50 pointer-events-none" />
           
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-plannera-orange/10 border border-plannera-orange/20 flex items-center justify-center">
                 <Users className="w-6 h-6 text-plannera-orange" />
              </div>
              <div>
                 <DialogTitle className="text-xl font-black uppercase tracking-tighter leading-none mb-1 text-[#2d3558] dark:text-white">
                   {isEditing ? 'Editar Interação' : 'Detalhes da Interação'}
                 </DialogTitle>
                 <DialogDescription className="text-content-secondary dark:text-content-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
                    Estratégia e Relacionamento
                 </DialogDescription>
              </div>
           </div>

            <div className="flex items-center gap-3 relative z-10">
              {!isEditing && (
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setIsEditing(true)}
                   className="bg-plannera-orange/10 border-plannera-orange/20 text-plannera-orange hover:bg-plannera-orange hover:text-white font-black uppercase tracking-widest text-[10px] h-9 gap-2 shadow-lg"
                >
                   <Edit2 className="w-3.5 h-3.5" /> Editar Log
                </Button>
              )}
              {isEditing && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setIsEditing(false)}
                   className="text-content-secondary dark:text-content-secondary hover:text-[#2d3558] dark:hover:text-white hover:bg-surface-card dark:hover:bg-slate-800 font-black uppercase tracking-widest text-[10px]"
                 >
                    Cancelar
                 </Button>
              )}
           </div>
        </div>

        <div className="p-10 space-y-10 max-h-[60vh] overflow-y-auto custom-scrollbar">
          {interaction && (
            <AnimatePresence mode="wait">
              <motion.div 
                key={isEditing ? 'edit' : 'view'}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-10"
              >
                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-surface-background dark:bg-slate-800/50 p-8 rounded-2xl border border-border-divider dark:border-slate-800 shadow-sm">
                  
                  {/* Account Name */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
                       <Target className="w-3.5 h-3.5 text-plannera-orange" /> LOGO Vinculado
                    </p>
                    <p className="text-sm font-black text-[#2d3558] dark:text-white uppercase tracking-tight pl-1">{accountName || '—'}</p>
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
                       <History className="w-3.5 h-3.5 text-plannera-orange" /> Data de Realização
                    </p>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editForm.date || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white h-11 text-sm font-black uppercase rounded-xl shadow-sm"
                      />
                    ) : (
                      <p className="text-sm font-black text-[#2d3558] dark:text-white uppercase tracking-tight pl-1">
                        {format(new Date(interaction.date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>

                  {/* Activity Type */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
                       <Activity className="w-3.5 h-3.5 text-plannera-orange" /> Tipo de Interação
                    </p>
                    {isEditing ? (
                      <Select
                        value={editForm.type}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, type: val }))}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-11 text-[11px] font-black uppercase tracking-widest text-plannera-orange rounded-xl shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white">
                          {Object.entries(interactionTypes).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="uppercase text-[10px] font-black hover:bg-surface-background dark:hover:bg-slate-800 focus:bg-surface-background dark:focus:bg-slate-800 focus:text-[#2d3558] dark:focus:text-white cursor-pointer transition-colors">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex">
                         <Badge className="bg-plannera-orange/10 text-plannera-orange border border-plannera-orange/20 px-4 py-1.5 font-black uppercase tracking-widest text-[9px] rounded-full shadow-sm">
                           {interactionTypes[interaction.type] || interaction.type}
                         </Badge>
                      </div>
                    )}
                  </div>

                  {/* Title (Contact/Subject) */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
                       <FileText className="w-3.5 h-3.5 text-plannera-orange" /> Título / Com quem
                    </p>
                    {isEditing ? (
                      <Input
                        value={editForm.title || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, title: e.target.value }))}
                        className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white h-11 text-sm font-bold rounded-xl shadow-sm"
                        placeholder="Nome do contato ou assunto"
                      />
                    ) : (
                      <p className="text-sm font-black text-[#2d3558] dark:text-white tracking-tight pl-1">
                        {interaction.title || '—'}
                      </p>
                    )}
                  </div>
                </div>

                {/* Checklist / Transcript Textarea */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 ml-1">
                     <Activity className="w-5 h-5 text-plannera-orange" />
                     <p className="text-[11px] text-[#2d3558] dark:text-white uppercase font-black tracking-[0.2em]">Apontamentos & Checklist Validado</p>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={editForm.raw_transcript || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, raw_transcript: e.target.value }))}
                      className="bg-surface-background dark:bg-slate-800/50 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white min-h-[200px] text-base font-bold tracking-tight rounded-2xl p-8 focus-visible:ring-plannera-orange/30 shadow-inner"
                      placeholder="Descreva detalhadamente o que foi conversado ou o checklist realizado..."
                    />
                  ) : (
                    <div className="bg-surface-background dark:bg-slate-800/50 p-8 rounded-2xl border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white text-base font-medium tracking-tight leading-relaxed shadow-inner whitespace-pre-wrap">
                      {interaction.raw_transcript || "Nenhum apontamento ou checklist registrado."}
                    </div>
                  )}
                </div>

                {/* AI Insights Area */}
                {interaction.metadata && (isEditing || interaction.metadata.operation_context || interaction.metadata.original_insight) && (
                  <div className="space-y-10 pt-10 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-1">
                         <div className="w-8 h-8 rounded-lg bg-indigo-500/10 flex items-center justify-center">
                            <Activity className="w-4 h-4 text-indigo-500" />
                         </div>
                         <p className="text-[11px] text-[#2d3558] dark:text-white uppercase font-black tracking-[0.2em]">Contexto Operacional</p>
                      </div>
                      <div className="bg-indigo-50/30 dark:bg-indigo-500/[0.02] p-8 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed shadow-sm">
                        {interaction.metadata.operation_context || "Sem contexto adicional mapeado pela I.A."}
                      </div>
                    </div>

                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-1 text-content-secondary">
                         <History className="w-4 h-4" />
                         <p className="text-[10px] uppercase font-black tracking-[0.2em]">Insight Original</p>
                      </div>
                      <div className="bg-surface-background dark:bg-slate-800/20 p-6 rounded-xl border border-border-divider dark:border-slate-800 text-content-secondary dark:text-content-secondary text-[11px] italic leading-relaxed">
                        "{interaction.metadata.original_insight || "Transcrição bruta não disponível."}"
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-10 border-t border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50 rounded-b-2xl flex items-center justify-between">
            {interaction && !isEditing ? (
               <Button 
                 variant="ghost" 
                 onClick={handleDelete}
                 className="text-destructive/60 hover:text-destructive hover:bg-destructive/10 font-black uppercase tracking-widest text-[10px] gap-2 h-11 px-6 rounded-xl transition-all"
               >
                  <Trash2 className="w-4.5 h-4.5" /> Remover Registro
               </Button>
            ) : <div />}

            {isEditing && (
               <div className="flex gap-4">
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-[0.2em] h-12 px-10 shadow-xl shadow-plannera-orange/20 gap-3 group rounded-xl active:scale-[0.98] transition-all"
                  >
                    {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Check className="w-4 h-4 group-hover:scale-125 transition-transform" />}
                    Salvar Alterações
                  </Button>
               </div>
            )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
