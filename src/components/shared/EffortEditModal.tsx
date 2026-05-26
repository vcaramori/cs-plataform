'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Badge } from '@/components/ui/badge'
import {
  Clock,
  Edit2,
  History,
  Target,
  Zap,
  Activity,
  X,
  Trash2,
  Loader2,
  Check,
  Calendar,
  Brain
} from 'lucide-react'
import { MaskedInput } from '@/components/ui/masked-input'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'
import { motion, AnimatePresence } from 'framer-motion'

import { RawTextViewer } from './RawTextViewer'
import { AttachmentsGallery } from './AttachmentsGallery'
import { AttachmentsUploader } from './AttachmentsUploader'

const activityLabels: Record<string, string> = {
  'preparation': 'Preparação',
  'environment-analysis': 'Análise de Ambiente',
  'meeting-execution': 'Execução de Reunião',
  'follow-up': 'Follow-up',
  'strategic-planning': 'Planejamento Estratégico',
  'technical-support': 'Suporte Técnico'
}

interface Entry {
  id: string
  account_id: string
  activity_type: string
  description?: string | null
  parsed_description?: string | null
  date: string
  direct_hours?: number
  parsed_hours?: number
  csm_id: string
  natural_language_input?: string
  logged_at?: string
  accounts?: { name: string } | null
  metadata?: {
    operation_context?: string
    original_insight?: string
  }
  file_urls?: string[] | null
}

interface Props {
  entry: Entry | null
  onClose: () => void
  onUpdate: (updated: Entry) => void
  accounts: any[]
}

export function EffortEditModal({ entry, onClose, onUpdate, accounts }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Entry>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setEditForm({
        activity_type: entry.activity_type,
        description: entry.description ?? entry.parsed_description ?? null,
        date: entry.date,
        direct_hours: entry.direct_hours ?? entry.parsed_hours ?? 0,
        account_id: entry.account_id,
        file_urls: entry.file_urls ?? []
      })
      setIsEditing(false)
    }
  }, [entry])

  const handleSave = async () => {
    if (!entry || isSaving) return
    setIsSaving(true)
    try {
      const resp = await fetch(`/api/time-entries/${entry.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      })

      if (!resp.ok) throw new Error('Falha ao salvar')
      const updated = await resp.json()
      onUpdate(updated)
      setIsEditing(false)
      toast.success('Registro de esforço atualizado')
    } catch (err) {
      toast.error('Erro ao processar alteração')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!entry || !confirm(`Deseja realmente excluir este registro de esforço? Esta ação não pode ser desfeita.`)) return
    setIsSaving(true)
    try {
      const resp = await fetch(`/api/time-entries/${entry.id}`, { method: 'DELETE' })
      if (!resp.ok) throw new Error()
      toast.success('Registro removido')
      onClose()
    } catch (err) {
      console.error('[EffortEditModal] Delete error:', err)
      toast.error('Erro ao deletar registro')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 shadow-2xl text-[#2d3558] dark:text-white max-w-2xl overflow-hidden p-0 rounded-2xl">

        <div className="relative h-24 bg-surface-background dark:bg-slate-800/50 border-b border-border-divider dark:border-slate-800 flex items-center px-10 justify-between">
          <div className="absolute inset-0 bg-plannera-primary/5 blur-3xl rounded-full opacity-50 pointer-events-none" />

          <div className="flex items-center gap-4 relative z-10">
            <div className="w-12 h-12 rounded-2xl bg-plannera-primary/10 border border-plannera-primary/20 flex items-center justify-center">
              <Clock className="w-6 h-6 text-plannera-primary" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter leading-none mb-1 text-[#2d3558] dark:text-white">
                {isEditing ? 'Editar Registro' : 'Detalhes do Esforço'}
              </DialogTitle>
              <DialogDescription className="text-content-secondary dark:text-content-secondary text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
                Refinamento de Log Automático com I.A
              </DialogDescription>
            </div>
          </div>

          <div className="flex items-center gap-3 relative z-10">
            {!isEditing && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setIsEditing(true)}
                className="bg-plannera-primary/10 border-plannera-primary/20 text-plannera-primary hover:bg-plannera-primary hover:text-white font-black uppercase tracking-widest text-[10px] h-9 gap-2 shadow-lg"
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
          {entry && (
            <AnimatePresence mode="wait">
              <motion.div
                key={isEditing ? 'edit' : 'view'}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-10"
              >
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-surface-background dark:bg-slate-800/50 p-8 rounded-2xl border border-border-divider dark:border-slate-800 shadow-sm">

                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
                      <Target className="w-3.5 h-3.5 text-plannera-primary" /> Conta Vinculada
                    </p>
                    {isEditing ? (
                      <SearchableSelect
                        options={accounts.map(a => ({ value: a.id, label: a.name }))}
                        value={editForm.account_id || ''}
                        onValueChange={(val: string) => setEditForm(prev => ({ ...prev, account_id: val }))}
                        placeholder="Selecione a conta..."
                        className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800"
                      />
                    ) : (
                      <p className="text-sm font-black text-[#2d3558] dark:text-white uppercase tracking-tight pl-1">
                        {accounts.find(a => a.id === entry.account_id)?.name || 'Conta Cliente'}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
                      <Calendar className="w-3.5 h-3.5 text-plannera-primary" /> Realizado em
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
                        {format(new Date(entry.date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
                      <Zap className="w-3.5 h-3.5 text-plannera-primary" /> Tipo de Atividade
                    </p>
                    {isEditing ? (
                      <Select
                        value={editForm.activity_type}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, activity_type: val }))}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 h-11 text-[11px] font-black uppercase tracking-widest text-plannera-primary rounded-xl shadow-sm">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white">
                          {Object.entries(activityLabels).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="uppercase text-[10px] font-black hover:bg-surface-background dark:hover:bg-slate-800 focus:bg-surface-background dark:focus:bg-slate-800 focus:text-[#2d3558] dark:focus:text-white cursor-pointer transition-colors">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex">
                        <Badge className="bg-plannera-primary/10 text-plannera-primary border border-plannera-primary/20 px-4 py-1.5 font-black uppercase tracking-widest text-[9px] rounded-full shadow-sm">
                          {activityLabels[entry.activity_type] || entry.activity_type}
                        </Badge>
                      </div>
                    )}
                  </div>

                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-content-secondary dark:text-content-secondary uppercase font-black tracking-[0.2em] ml-1">
                      <Clock className="w-3.5 h-3.5 text-plannera-primary" /> Tempo Alocado
                    </p>
                    {isEditing ? (
                      <MaskedInput
                        maskType="decimal"
                        value={String(editForm.direct_hours || 0)}
                        onValueChange={(val: string) => setEditForm(prev => ({ ...prev, direct_hours: Number(val) || 0 }))}
                        className="bg-white dark:bg-slate-900 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white h-11 text-sm font-black uppercase rounded-xl shadow-sm"
                      />
                    ) : (
                      <p className="text-sm font-black text-[#2d3558] dark:text-white tracking-tight pl-1">
                        {entry.direct_hours ?? entry.parsed_hours ?? 0} horas de esforço
                      </p>
                    )}
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3 ml-1">
                    <Activity className="w-5 h-5 text-plannera-primary" />
                    <p className="text-[11px] text-[#2d3558] dark:text-white uppercase font-black tracking-[0.2em]">Descrição da Atividade</p>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={editForm.description || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, description: e.target.value }))}
                      className="bg-surface-background dark:bg-slate-800/50 border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white min-h-[160px] text-base font-bold tracking-tight rounded-2xl p-8 focus-visible:ring-plannera-primary/30 shadow-inner"
                      placeholder="Descreva o que foi realizado nesta atividade..."
                    />
                  ) : (
                    <div className="bg-surface-background dark:bg-slate-800/50 p-8 rounded-2xl border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white text-base font-medium tracking-tight leading-relaxed shadow-inner whitespace-pre-wrap">
                      {entry.description ?? entry.parsed_description ?? "Nenhuma descrição detalhada fornecida."}
                    </div>
                  )}
                </div>

                {isEditing ? (
                  <div className="space-y-4 pt-4 border-t border-border-divider dark:border-slate-800/50">
                    <div className="space-y-2">
                      <p className="text-[11px] uppercase font-black tracking-[0.2em] text-[#2d3558] dark:text-white ml-1">Mídias Anexadas</p>
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
                    {entry.file_urls && entry.file_urls.length > 0 && (
                      <div className="pt-4 border-t border-border-divider dark:border-slate-800/50">
                        <AttachmentsGallery urls={entry.file_urls} />
                      </div>
                    )}
                    {(entry.natural_language_input || entry.metadata?.original_insight) && (
                      <div className="pt-4 border-t border-border-divider dark:border-slate-800/50">
                        <RawTextViewer 
                          text={entry.natural_language_input || entry.metadata?.original_insight || ''} 
                          title="Transcrição Bruta / Texto Original" 
                          filename={`transcricao-esforco-${entry.id}.txt`} 
                        />
                      </div>
                    )}
                  </>
                )}

                {entry.metadata && (isEditing || entry.metadata.operation_context) && (
                  <div className="space-y-10 pt-10 border-t border-slate-100 dark:border-slate-800/50">
                    <div className="space-y-4">
                      <div className="flex items-center gap-3 ml-1">
                        <Brain className="w-5 h-5 text-plannera-primary" />
                        <p className="text-[11px] text-[#2d3558] dark:text-white uppercase font-black tracking-[0.2em]">Contexto Operacional</p>
                      </div>
                      <div className="bg-indigo-50/30 dark:bg-indigo-500/[0.02] p-8 rounded-2xl border border-indigo-100 dark:border-indigo-500/10 text-slate-600 dark:text-slate-300 text-sm font-medium leading-relaxed shadow-sm">
                        {entry.metadata.operation_context || "Sem contexto adicional mapeado pela I.A."}
                      </div>
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        <div className="p-10 border-t border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50 rounded-b-2xl flex items-center justify-between">
          {entry && !isEditing ? (
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
                className="bg-plannera-primary hover:bg-plannera-primary/90 text-white font-black uppercase tracking-[0.2em] h-12 px-10 shadow-xl shadow-plannera-primary/20 gap-3 group rounded-xl active:scale-[0.98] transition-all"
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
