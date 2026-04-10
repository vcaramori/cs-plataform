'use client'

import { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Button } from '@/components/ui/button'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Badge } from '@/components/ui/badge'
import { Clock, Loader2, Save, Edit2, History } from 'lucide-react'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { ptBR } from 'date-fns/locale'

const activityLabels: Record<string, string> = {
  meeting: 'Reunião com Cliente',
  onboarding: 'Onboarding / Implantação',
  qbr: 'QBR / Review',
  internal: 'Reunião Interna',
  analysis: 'Análise de Dados',
  report: 'Elaboração de Relatório',
  setup: 'Configuração / Setup',
  other: 'Outro'
}

interface Entry {
  id: string
  account_id: string
  csm_id: string
  activity_type: string
  parsed_hours: number
  date: string
  parsed_description: string
  natural_language_input: string
  accounts?: { name: string }
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
      setIsEditing(false)
      toast.success('Registro atualizado')
    } catch (err) {
      toast.error('Erro ao salvar alterações')
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={!!entry} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-2xl overflow-hidden">
        <DialogHeader className="flex flex-row items-center justify-between space-y-0 pb-4 border-b border-slate-800">
          <div className="space-y-1">
            <DialogTitle className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-indigo-400" />
              {isEditing ? 'Editar Registro' : 'Detalhes do Esforço'}
            </DialogTitle>
          </div>
          {!isEditing && (
            <Button 
                variant="outline" 
                size="sm" 
                onClick={() => setIsEditing(true)}
                className="bg-slate-800 border-slate-700 hover:bg-slate-700 text-slate-300 gap-2 h-8"
              >
                <Edit2 className="w-3.5 h-4" /> Editar
              </Button>
          )}
        </DialogHeader>

        <div className="space-y-6 py-4 max-h-[70vh] overflow-y-auto pr-2 custom-scrollbar">
          {entry && (
            <>
              <div className="grid grid-cols-2 gap-4 bg-slate-800/30 p-4 rounded-xl border border-slate-800/50">
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Conta</p>
                  {isEditing ? (
                    <SearchableSelect
                      options={accounts.map(a => ({ value: a.id, label: a.name }))}
                      value={editForm.account_id || ''}
                      onChange={(val) => setEditForm(prev => ({ ...prev, account_id: val }))}
                      placeholder="Selecione a conta"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white">{entry.accounts?.name ?? '—'}</p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Data</p>
                  {isEditing ? (
                    <Input
                      type="date"
                      value={editForm.date || ''}
                      onChange={(e) => setEditForm(prev => ({ ...prev, date: e.target.value }))}
                      className="bg-slate-950 border-slate-800 h-9 text-sm"
                    />
                  ) : (
                    <p className="text-sm font-semibold text-white">
                      {format(new Date(entry.date + 'T12:00:00'), "dd/MM/yyyy")}
                    </p>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Tipo de Atividade</p>
                  {isEditing ? (
                    <Select
                      value={editForm.activity_type}
                      onValueChange={(val) => setEditForm(prev => ({ ...prev, activity_type: val }))}
                    >
                      <SelectTrigger className="bg-slate-950 border-slate-800 h-9 text-sm">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        {Object.entries(activityLabels).map(([val, label]) => (
                          <SelectItem key={val} value={val}>{label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  ) : (
                    <Badge className="bg-indigo-500/10 text-indigo-300 border-indigo-500/20 py-0 text-[10px] font-medium">
                      {activityLabels[entry.activity_type] ?? entry.activity_type}
                    </Badge>
                  )}
                </div>
                <div className="space-y-1.5">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest">Duração</p>
                  {isEditing ? (
                    <div className="flex items-center gap-2">
                       <Input
                        type="number"
                        step="0.5"
                        value={editForm.parsed_hours || 0}
                        onChange={(e) => setEditForm(prev => ({ ...prev, parsed_hours: Number(e.target.value) }))}
                        className="bg-slate-950 border-slate-800 h-9 text-sm w-24"
                      />
                      <span className="text-xs text-slate-500">horas</span>
                    </div>
                  ) : (
                    <p className="text-sm font-bold text-indigo-400">{entry.parsed_hours}h</p>
                  )}
                </div>
              </div>

              <div className="space-y-2">
                <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-1">Descrição Final (IA)</p>
                {isEditing ? (
                  <Textarea
                    value={editForm.parsed_description || ''}
                    onChange={(e) => setEditForm(prev => ({ ...prev, parsed_description: e.target.value }))}
                    className="bg-slate-950 border-slate-800 text-white min-h-[120px] text-sm leading-relaxed"
                  />
                ) : (
                  <div className="bg-slate-800/10 p-4 rounded-xl border border-slate-800 text-slate-200 text-sm leading-relaxed">
                    {entry.parsed_description}
                  </div>
                )}
              </div>

              {!isEditing && (
                <div className="space-y-2">
                  <p className="text-[10px] text-slate-500 uppercase font-black tracking-widest px-1">Registro Original (Linguagem Natural)</p>
                  <div className="bg-slate-950/50 p-4 rounded-xl border border-slate-800/50 text-slate-500 italic text-xs leading-relaxed">
                    "{entry.natural_language_input}"
                  </div>
                </div>
              )}
            </>
          )}
        </div>

        {isEditing && (
          <DialogFooter className="gap-2 pt-4 border-t border-slate-800">
            <Button 
                variant="ghost" 
                onClick={() => setIsEditing(false)}
                disabled={isSaving}
                className="text-slate-400"
              >
                Cancelar
              </Button>
              <Button 
                onClick={handleSave}
                disabled={isSaving}
                className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                Salvar Alterações
              </Button>
          </DialogFooter>
        )}
      </DialogContent>
    </Dialog>
  )
}
