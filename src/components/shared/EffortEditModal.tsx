'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogTitle, DialogDescription, DialogClose } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Badge } from '@/components/ui/badge'
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

const activityConfig: Record<string, { label: string, color: string, bg: string, icon: any }> = {
  prep: { label: 'Preparação', color: 'text-indigo-400', bg: 'bg-indigo-500/10', icon: History },
  meeting: { label: 'Reunião Cliente', color: 'text-emerald-400', bg: 'bg-emerald-500/10', icon: Activity },
  onboarding: { label: 'Onboarding', color: 'text-blue-400', bg: 'bg-blue-500/10', icon: Zap },
  qbr: { label: 'Estratégico / QBR', color: 'text-purple-400', bg: 'bg-purple-500/10', icon: Target },
  internal: { label: 'Interno', color: 'text-slate-400', bg: 'bg-slate-500/10', icon: Clock },
  analysis: { label: 'Análise Técnica', color: 'text-orange-400', bg: 'bg-orange-500/10', icon: Activity },
  other: { label: 'Outro', color: 'text-slate-500', bg: 'bg-slate-500/5', icon: Activity }
}

const activityLabels: Record<string, string> = {
  preparation: 'Preparação de Deck',
  'environment-analysis': 'Análise de Ambiente',
  strategy: 'Estratégia Interna',
  reporting: 'Relatórios',
  'internal-meeting': 'Reunião Interna',
  meeting: 'Reunião com Cliente',
  onboarding: 'Implantação / Onboarding',
  qbr: 'QBR / Sucesso',
  other: 'Outro'
}

interface Entry {
  id: string
  account_id: string
  csm_id: string
  activity_type: string
  parsed_hours: number
  date: string
  logged_at: string
  parsed_description: string
  natural_language_input: string
  accounts: { name: string } | null
}

interface Props {
  entry: Entry | null
  onClose: () => void
  onUpdate: (updated: Entry) => void
  accounts: { id: string; name: string }[]
}

export function EffortEditModal({ entry, onClose, onUpdate, accounts }: Props) {
  const [isEditing, setIsEditing] = useState(false)
  const [editForm, setEditForm] = useState<Partial<Entry>>({})
  const [isSaving, setIsSaving] = useState(false)

  useEffect(() => {
    if (entry) {
      setEditForm({
        account_id: entry.account_id,
        activity_type: entry.activity_type,
        parsed_hours: entry.parsed_hours,
        date: entry.date,
        parsed_description: entry.parsed_description
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
      setIsEditing(true) // Stay in editing or close? The user said they couldn't edit, so I'll stay in view mode now.
      setIsEditing(false)
      toast.success('Log de esforço sincronizado com sucesso')
    } catch (err) {
      toast.error('Erro ao processar alteração')
    } finally {
      setIsSaving(false)
    }
  }

  const handleDelete = async () => {
    if (!entry || !confirm(`Deseja realmente excluir este registro? Esta ação é irreversível e removerá também a interação vinculada.`)) return
    setIsSaving(true)
    try {
       const resp = await fetch(`/api/time-entries/${entry.id}`, { method: 'DELETE' })
       if (!resp.ok) throw new Error()
       toast.success('Registro removido')
       onClose()
       // O componente pai deve lidar com a remoção da lista via router.refresh() ou trigger manual
    } catch {
       toast.error('Erro ao deletar')
    } finally {
       setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl text-[#2d3558] dark:text-white max-w-2xl overflow-hidden p-0 rounded-2xl">
        
        {/* Header Area with Subtle Glow */}
        <div className="relative h-24 bg-slate-50 dark:bg-slate-800/50 border-b border-slate-200 dark:border-slate-800 flex items-center px-10 justify-between">
           <div className="absolute inset-0 bg-plannera-primary/5 blur-3xl rounded-full opacity-50 pointer-events-none" />
           
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                 <Clock className="w-6 h-6 text-plannera-primary" />
              </div>
              <div>
                 <DialogTitle className="text-xl font-black uppercase tracking-tighter leading-none mb-1 text-[#2d3558] dark:text-white">
                   {isEditing ? 'Configurar Inteligência' : 'Análise de Esforço'}
                 </DialogTitle>
                 <DialogDescription className="text-slate-500 dark:text-slate-400 text-[10px] font-black uppercase tracking-[0.2em] opacity-80 leading-none">
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
                   className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 font-black uppercase tracking-widest text-[10px] h-9 gap-2 shadow-sm"
                >
                   <Edit2 className="w-3.5 h-3.5" /> Editar Log
                </Button>
              )}
              {isEditing && (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setIsEditing(false)}
                   className="text-slate-500 dark:text-slate-400 hover:text-[#2d3558] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 font-black uppercase tracking-widest text-[10px]"
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
                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8 bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
                  
                  {/* Account Selector */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] ml-1">
                       <Target className="w-3.5 h-3.5 text-plannera-primary" /> Conta Alvo
                    </p>
                    {isEditing ? (
                      <SearchableSelect
                        options={accounts.map(a => ({ value: a.id, label: a.name.toUpperCase() }))}
                        value={editForm.account_id || ''}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, account_id: val }))}
                        className="h-11 rounded-xl border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900"
                      />
                    ) : (
                      <p className="text-sm font-black text-[#2d3558] dark:text-white uppercase tracking-tight pl-1">{entry.accounts?.name ?? '—'}</p>
                    )}
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] ml-1">
                       <Calendar className="w-3.5 h-3.5 text-plannera-primary" /> Realizado em
                    </p>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editForm.date || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 text-sm font-black uppercase rounded-xl"
                      />
                    ) : (
                      <p className="text-sm font-black text-[#2d3558] dark:text-white uppercase tracking-tight pl-1">
                        {format(new Date(entry.date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>

                  {/* Activity Type */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] ml-1">
                       <Zap className="w-3.5 h-3.5 text-plannera-primary" /> Tipo de Atividade
                    </p>
                    {isEditing ? (
                      <Select
                        value={editForm.activity_type}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, activity_type: val }))}
                      >
                        <SelectTrigger className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 h-11 text-[11px] font-black uppercase tracking-widest text-[#2d3558] dark:text-white rounded-xl">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white">
                          {Object.entries(activityLabels).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="uppercase text-[10px] font-black">{label}</SelectItem>
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

                  {/* Hours */}
                  <div className="space-y-3">
                    <p className="flex items-center gap-2 text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] ml-1">
                       <Clock className="w-3.5 h-3.5 text-plannera-primary" /> Tempo Dedicado
                    </p>
                    {isEditing ? (
                      <div className="flex items-center gap-4">
                         <MaskedInput 
                          maskType="decimal"
                          value={String(editForm.parsed_hours || 0)}
                          onValueChange={(val) => setEditForm(prev => ({ ...prev, parsed_hours: parseFloat(val) || 0 }))}
                          className="bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white h-11 text-sm font-black w-32 rounded-xl"
                        />
                        <span className="text-[9px] font-black text-slate-400 dark:text-slate-500 uppercase">Horas</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-2 pl-1">
                         <span className="text-2xl font-black text-[#2d3558] dark:text-white leading-none tabular-nums">{entry.parsed_hours}</span>
                         <span className="text-[10px] font-black text-slate-500 dark:text-slate-400 uppercase tracking-widest">hrs</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Textarea / Narrative */}
                <div className="space-y-4">
                  <div className="flex items-center gap-3 ml-1">
                     <Brain className="w-5 h-5 text-plannera-primary" />
                     <p className="text-[11px] text-[#2d3558] dark:text-white uppercase font-black tracking-[0.2em]">Contexto Operacional</p>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={editForm.parsed_description || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, parsed_description: e.target.value }))}
                      className="bg-slate-50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white min-h-[160px] text-base font-bold tracking-tight rounded-2xl p-8 focus-visible:ring-plannera-primary/30 shadow-inner"
                      placeholder="Descreva detalhadamente o esforço executado..."
                    />
                  ) : (
                    <div className="bg-slate-50 dark:bg-slate-800/50 p-8 rounded-2xl border border-slate-200 dark:border-slate-800 text-[#2d3558] dark:text-white text-base font-medium tracking-tight leading-relaxed shadow-inner">
                      {entry.parsed_description}
                    </div>
                  )}
                </div>

                {/* Grounding Info */}
                {!isEditing && (
                  <div className="space-y-4 opacity-40 hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-slate-500 dark:text-slate-400 uppercase font-black tracking-[0.2em] ml-2">Insight Original (Input de voz/texto)</p>
                    <div className="bg-white dark:bg-slate-900 p-6 rounded-2xl border border-slate-200 dark:border-slate-800 text-slate-500 dark:text-slate-400 italic text-[11px] font-medium leading-relaxed shadow-sm">
                      &quot;{entry.natural_language_input}&quot;
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-10 border-t border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/50 rounded-b-2xl flex items-center justify-between">
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
                    Sincronizar Inteligência
                  </Button>
               </div>
            )}
        </div>

      </DialogContent>
    </Dialog>
  )
}
