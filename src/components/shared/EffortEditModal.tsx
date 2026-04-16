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
  Check
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
      <DialogContent className="glass-card border-none text-white max-w-2xl overflow-hidden p-0 backdrop-blur-3xl shadow-[0_0_80px_rgba(0,0,0,0.6)]">
        
        {/* Header Area with Subtle Glow */}
        <div className="relative h-24 bg-gradient-to-r from-indigo-900/40 to-black/40 border-b border-white/5 flex items-center px-8 justify-between">
           <div className="absolute inset-0 bg-indigo-500/10 blur-3xl rounded-full opacity-20 pointer-events-none" />
           
           <div className="flex items-center gap-4 relative z-10">
              <div className="w-12 h-12 rounded-2xl bg-indigo-600/10 border border-indigo-500/20 flex items-center justify-center">
                 <Clock className="w-6 h-6 text-indigo-400" />
              </div>
              <div>
                 <DialogTitle className="text-xl font-black uppercase tracking-tighter leading-none mb-1">
                   {isEditing ? 'Configurar Inteligência' : 'Análise de Esforço'}
                 </DialogTitle>
                 <DialogDescription className="text-slate-500 text-[10px] font-black uppercase tracking-widest opacity-70 leading-none">
                    Refinamento de Log Automático com I.A
                 </DialogDescription>
              </div>
           </div>

           <div className="flex items-center gap-2 relative z-10">
              {isEditing ? (
                 <Button 
                   variant="ghost" 
                   size="sm" 
                   onClick={() => setIsEditing(false)}
                   className="text-slate-400 hover:text-white font-black uppercase tracking-widest text-[10px]"
                 >
                    Cancelar
                 </Button>
              ) : (
                <Button 
                   variant="outline" 
                   size="sm" 
                   onClick={() => setIsEditing(true)}
                   className="bg-indigo-600/10 border-indigo-500/20 text-indigo-400 hover:bg-indigo-600 hover:text-white font-black uppercase tracking-widest text-[10px] h-9 gap-2"
                >
                   <Edit2 className="w-3.5 h-3.5" /> Editar Log
                </Button>
              )}
              <DialogClose className="opacity-40 hover:opacity-100 transition-opacity ml-2">
                 <X className="w-5 h-5" />
              </DialogClose>
           </div>
        </div>

        <div className="p-8 space-y-8 max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-white/5">
          {entry && (
            <AnimatePresence mode="wait">
              <motion.div 
                key={isEditing ? 'edit' : 'view'}
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 1.02 }}
                className="space-y-8"
              >
                {/* Information Grid */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6 bg-black/20 p-6 rounded-2xl border border-white/5">
                  
                  {/* Account Selector */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] ml-1">
                       <Target className="w-3 h-3" /> LOGO Vinculado
                    </p>
                    {isEditing ? (
                      <SearchableSelect
                        options={accounts.map(a => ({ value: a.id, label: a.name.toUpperCase() }))}
                        value={editForm.account_id || ''}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, account_id: val }))}
                      />
                    ) : (
                      <p className="text-sm font-black text-white uppercase tracking-tight pl-1">{entry.accounts?.name ?? '—'}</p>
                    )}
                  </div>

                  {/* Date Picker */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] ml-1">
                       <History className="w-3 h-3" /> Data de Registro
                    </p>
                    {isEditing ? (
                      <Input
                        type="date"
                        value={editForm.date || ''}
                        onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                        className="bg-slate-900/50 border-white/5 h-10 text-sm font-bold uppercase"
                      />
                    ) : (
                      <p className="text-sm font-black text-white uppercase tracking-tight pl-1">
                        {format(new Date(entry.date + 'T12:00:00'), "dd 'de' MMMM, yyyy", { locale: ptBR })}
                      </p>
                    )}
                  </div>

                  {/* Activity Type */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] ml-1">
                       <Zap className="w-3 h-3" /> Tipo de Atividade
                    </p>
                    {isEditing ? (
                      <Select
                        value={editForm.activity_type}
                        onValueChange={(val) => setEditForm(prev => ({ ...prev, activity_type: val }))}
                      >
                        <SelectTrigger className="bg-slate-900/50 border-white/5 h-10 text-[11px] font-black uppercase tracking-widest text-indigo-400">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-slate-900 border-white/10 text-white">
                          {Object.entries(activityLabels).map(([val, label]) => (
                            <SelectItem key={val} value={val} className="uppercase text-[10px] font-black">{label}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    ) : (
                      <div className="flex">
                         <Badge className="bg-indigo-600/10 text-indigo-400 border border-indigo-500/20 px-3 py-1 font-black uppercase tracking-widest text-[9px]">
                           {activityLabels[entry.activity_type] || entry.activity_type}
                         </Badge>
                      </div>
                    )}
                  </div>

                  {/* Hours */}
                  <div className="space-y-2">
                    <p className="flex items-center gap-2 text-[10px] text-slate-500 uppercase font-black tracking-[0.2em] ml-1">
                       <Clock className="w-3 h-3" /> Duração Ingerida
                    </p>
                    {isEditing ? (
                      <div className="flex items-center gap-3">
                         <MaskedInput 
                          maskType="decimal"
                          value={String(editForm.parsed_hours || 0)}
                          onValueChange={(val) => setEditForm(prev => ({ ...prev, parsed_hours: parseFloat(val) || 0 }))}
                          className="bg-slate-900/50 border-white/5 h-10 text-sm font-black w-28"
                        />
                        <span className="text-[10px] font-black text-slate-600 uppercase">Horas Decimais</span>
                      </div>
                    ) : (
                      <div className="flex items-baseline gap-1 pl-1">
                         <span className="text-xl font-black text-indigo-400 leading-none">{entry.parsed_hours}</span>
                         <span className="text-[10px] font-black text-slate-500 uppercase">hrs</span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Description Textarea / Narrative */}
                <div className="space-y-3">
                  <div className="flex items-center gap-2 ml-1">
                     <Activity className="w-4 h-4 text-indigo-400" />
                     <p className="text-[11px] text-white uppercase font-black tracking-[0.2em]">Narrativa Estruturada (I.A)</p>
                  </div>
                  {isEditing ? (
                    <Textarea
                      value={editForm.parsed_description || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, parsed_description: e.target.value }))}
                      className="bg-black/40 border-white/5 text-slate-200 min-h-[140px] text-base font-bold tracking-tight rounded-2xl p-6 focus-visible:ring-indigo-500/50"
                      placeholder="Descreva detalhadamente o esforço executado..."
                    />
                  ) : (
                    <div className="bg-white/[0.03] p-6 rounded-2xl border border-white/5 text-slate-100 text-base font-bold tracking-tight leading-relaxed shadow-inner">
                      {entry.parsed_description}
                    </div>
                  )}
                </div>

                {/* Grounding Info */}
                {!isEditing && (
                  <div className="space-y-3 opacity-40 hover:opacity-100 transition-opacity">
                    <p className="text-[9px] text-slate-500 uppercase font-black tracking-[0.2em] ml-1">Insight Original (Input de voz/texto)</p>
                    <div className="bg-black/20 p-4 rounded-xl border border-white/5 text-slate-500 italic text-[11px] font-medium leading-relaxed">
                      &quot;{entry.natural_language_input}&quot;
                    </div>
                  </div>
                )}
              </motion.div>
            </AnimatePresence>
          )}
        </div>

        {/* Footer Actions */}
        <div className="p-8 border-t border-white/5 bg-black/40 flex items-center justify-between">
            {entry && !isEditing ? (
               <Button 
                 variant="ghost" 
                 onClick={handleDelete}
                 className="text-red-500/60 hover:text-red-500 hover:bg-red-500/10 font-black uppercase tracking-widest text-[10px] gap-2 h-10 px-4"
               >
                  <Trash2 className="w-4 h-4" /> Remover Registro
               </Button>
            ) : <div />}

            {isEditing && (
               <div className="flex gap-4">
                  <Button 
                    onClick={handleSave}
                    disabled={isSaving}
                    className="bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase tracking-[0.2em] h-11 px-8 shadow-[0_0_20px_rgba(99,102,241,0.4)] gap-2 group"
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
