'use client'

import { useState, useEffect } from 'react'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, Settings2, CheckCircle2, AlertCircle, Clock, Ban, HelpCircle, User, Calendar, Save } from 'lucide-react'
import { toast } from 'sonner'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'

interface Feature {
  id: string
  name: string
  module: string
}

interface AdoptionRecord {
  id: string
  feature_id: string
  status: 'not_started' | 'partial' | 'in_use' | 'blocked' | 'na'
  observation: string | null
  blocker_category: 'data_integration' | 'product_roadmap' | 'people_process' | 'governance' | 'no_strategic_relevance' | 'other' | null
  blocker_reason: string | null
  action_plan: string | null
  action_owner: string | null
  responsible_id: string | null
  target_date: string | null
  action_status: 'not_started' | 'in_progress' | 'completed' | 'paused'
  priority_level: 'low' | 'medium' | 'high'
  product_features: Feature
}

interface User {
  id: string
  email: string
}

export function AdoptionDetailsModal({ accountId, accountName }: { accountId: string, accountName: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState<string | null>(null)
  const [records, setRecords] = useState<AdoptionRecord[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [selectedRecord, setSelectedRecord] = useState<AdoptionRecord | null>(null)

  useEffect(() => {
    if (open) {
      fetchData()
    }
  }, [open])

  async function fetchData() {
    setLoading(true)
    try {
      const [adoptionRes, usersRes] = await Promise.all([
        fetch(`/api/accounts/${accountId}/adoption`),
        fetch('/api/users')
      ])

      if (adoptionRes.ok) {
        const data = await adoptionRes.json()
        setRecords(data)
      }
      if (usersRes.ok) {
        const data = await usersRes.json()
        setUsers(data)
      }
    } catch (e) {
      console.error(e)
      toast.error('Erro ao carregar dados de adoção')
    } finally {
      setLoading(false)
    }
  }

  async function updateRecord(record: AdoptionRecord) {
    setSaving(record.id)
    try {
      const payload = {
        feature_id: record.feature_id,
        status: record.status,
        observation: record.observation || null,
        blocker_category: record.blocker_category || null,
        blocker_reason: record.blocker_reason || null,
        action_plan: record.action_plan || null,
        action_owner: record.action_owner || null,
        responsible_id: record.responsible_id || null,
        target_date: record.target_date || null,
        action_status: record.action_status,
        priority_level: record.priority_level
      }

      const res = await fetch(`/api/accounts/${accountId}/adoption`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      })

      if (!res.ok) throw new Error('Falha ao salvar')
      toast.success(`Adoção de ${record.product_features.name} atualizada`)
      fetchData()
    } catch (e) {
      toast.error('Erro ao salvar alterações')
    } finally {
      setSaving(null)
    }
  }

  const statusOptions = [
    { label: 'Não Iniciado', value: 'not_started', icon: Clock, color: 'text-slate-400', bg: 'bg-slate-400/10' },
    { label: 'Uso Parcial', value: 'partial', icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Em Uso', value: 'in_use', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Bloqueado', value: 'blocked', icon: Ban, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Não Aplicável', value: 'na', icon: HelpCircle, color: 'text-slate-600', bg: 'bg-slate-600/10' },
  ]

  const blockerCategories = [
    { label: 'Integração Pendente', value: 'data_integration' },
    { label: 'Produto / Roadmap', value: 'product_roadmap' },
    { label: 'Processos / Pessoas', value: 'people_process' },
    { label: 'Governança', value: 'governance' },
    { label: 'Sem Relevância Estratégica', value: 'no_strategic_relevance' },
    { label: 'Outros', value: 'other' },
  ]

  const priorityOptions = [
    { label: 'Baixa', value: 'low' },
    { label: 'Média', value: 'medium' },
    { label: 'Alta', value: 'high' },
  ]

  const actionStatuses = [
    { label: 'Não Iniciado', value: 'not_started' },
    { label: 'Em Curso', value: 'in_progress' },
    { label: 'Concluído', value: 'completed' },
    { label: 'Pausado', value: 'paused' },
  ]

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="outline" size="icon" className="bg-white/5 border-white/10 text-slate-300 hover:text-white h-8 w-8 rounded-lg">
          <Settings2 className="w-4 h-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-5xl h-[85vh] flex flex-col p-0 overflow-hidden">
        <DialogHeader className="p-6 border-b border-white/5">
          <DialogTitle className="text-xl font-heading font-extrabold uppercase tracking-tight flex items-center gap-3">
            Adoção Funcional: <span className="text-plannera-orange">{accountName}</span>
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            Gerencie o status real de implementação e uso de cada funcionalidade contratada.
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 flex min-h-0">
          {/* List Section */}
          <div className="w-1/3 border-r border-white/5 overflow-y-auto p-4 space-y-2 custom-scrollbar bg-black/20">
            {loading ? (
              <div className="flex flex-col items-center justify-center h-40 gap-3">
                <Loader2 className="w-6 h-6 animate-spin text-plannera-orange" />
                <span className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">Sincronizando...</span>
              </div>
            ) : records.length === 0 ? (
              <div className="text-center py-10 opacity-40">
                <p className="text-[10px] font-bold uppercase text-slate-500">Nenhuma funcionalidade no plano.</p>
              </div>
            ) : (
              records.map(r => {
                const status = statusOptions.find(s => s.value === r.status)
                const Icon = status?.icon || Clock
                return (
                  <button
                    key={r.id}
                    onClick={() => setSelectedRecord(r)}
                    className={cn(
                      "w-full text-left p-3 rounded-xl border transition-all flex flex-col gap-2 group",
                      selectedRecord?.id === r.id 
                        ? "bg-white/10 border-white/20 shadow-lg" 
                        : "bg-transparent border-transparent hover:bg-white/5",
                      r.status === 'na' && "opacity-60"
                    )}
                  >
                    <div className="flex items-center justify-between">
                      <span className="text-[9px] font-bold uppercase tracking-widest text-slate-500">{r.product_features.module}</span>
                      <Icon className={cn("w-3 h-3", status?.color)} />
                    </div>
                    <span className={cn(
                      "text-[11px] font-bold uppercase tracking-tight transition-colors",
                      selectedRecord?.id === r.id ? "text-white" : "text-slate-400 group-hover:text-slate-200"
                    )}>
                      {r.product_features.name}
                    </span>
                    <Badge variant="outline" className={cn("w-fit text-[8px] border-none font-black uppercase", status?.bg, status?.color)}>
                      {status?.label}
                    </Badge>
                  </button>
                )
              })
            )}
          </div>

          {/* Edit Section */}
          <div className="flex-1 overflow-y-auto p-8 custom-scrollbar relative">
            {!selectedRecord ? (
              <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
                <Settings2 className="w-16 h-16" />
                <p className="text-xs font-bold uppercase tracking-widest">Selecione uma funcionalidade para editar</p>
              </div>
            ) : (
              <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
                <div className="flex items-center justify-between bg-white/[0.02] p-4 rounded-2xl border border-white/5 shadow-sm sticky top-0 z-10 backdrop-blur-md">
                  <div>
                    <h3 className="text-xl font-black uppercase text-white tracking-tight leading-tight">{selectedRecord.product_features.name}</h3>
                    <p className="text-[10px] font-bold uppercase text-slate-500 tracking-widest">{selectedRecord.product_features.module}</p>
                  </div>
                  <Button 
                    onClick={() => updateRecord(selectedRecord)} 
                    disabled={!!saving}
                    className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold uppercase text-[10px] tracking-widest h-11 rounded-xl px-8 shadow-[0_0_20px_rgba(5,150,105,0.2)] transition-all hover:scale-105 active:scale-95 gap-2"
                  >
                    {saving === selectedRecord.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                    Salvar
                  </Button>
                </div>

                <div className="grid grid-cols-2 gap-8">
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Status de Adoção</Label>
                      <div className="grid grid-cols-1 gap-2">
                        {statusOptions.map(opt => (
                          <button
                            key={opt.value}
                            onClick={() => setSelectedRecord({...selectedRecord, status: opt.value as any})}
                            className={cn(
                              "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                              selectedRecord.status === opt.value 
                                ? "bg-white/10 border-white/20 ring-1 ring-white/10" 
                                : "bg-black/20 border-white/5 opacity-50 hover:opacity-100"
                            )}
                          >
                            <opt.icon className={cn("w-4 h-4", opt.color)} />
                            <span className="text-[10px] font-bold uppercase tracking-widest text-white">{opt.label}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                        <User className="w-3 h-3" /> Responsável (CSM)
                      </Label>
                      <SearchableSelect
                        value={selectedRecord.responsible_id || ''}
                        onValueChange={(v) => setSelectedRecord({...selectedRecord, responsible_id: v || null})}
                        options={[
                          { label: 'Sem Responsável', value: '' },
                          ...users.map(u => ({ label: u.email, value: u.id }))
                        ]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1 flex items-center gap-2">
                        <Calendar className="w-3 h-3" /> Data Alvo para Evolução
                      </Label>
                      <Input
                        type="date"
                        value={selectedRecord.target_date || ''}
                        onChange={(e) => setSelectedRecord({...selectedRecord, target_date: e.target.value || null})}
                        className="bg-black/20 border-white/5 text-white h-11 rounded-xl focus:border-plannera-orange"
                      />
                    </div>
                  </div>
                </div>

                {/* Blocker Details Section - Conditional */}
                {(selectedRecord.status === 'blocked' || selectedRecord.status === 'na') && (
                  <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-6 animate-in slide-in-from-top-2">
                    <div className="flex items-center gap-2 text-red-400">
                      <Ban className="w-4 h-4" />
                      <h4 className="text-[10px] font-black uppercase tracking-widest">Detalhamento da Exceção / Bloqueio</h4>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Categoria do Bloqueio</Label>
                        <SearchableSelect
                          value={selectedRecord.blocker_category || ''}
                          onValueChange={(v) => setSelectedRecord({...selectedRecord, blocker_category: v as any})}
                          options={[
                            { label: 'Selecione uma categoria', value: '' },
                            ...blockerCategories
                          ]}
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Justificativa do Não Uso</Label>
                        <Input
                          value={selectedRecord.blocker_reason || ''}
                          onChange={(e) => setSelectedRecord({...selectedRecord, blocker_reason: e.target.value})}
                          placeholder="Ex: Falta de processo interno..."
                          className="bg-black/20 border-white/5 text-white h-11 rounded-xl focus:border-red-400"
                        />
                      </div>
                    </div>
                  </div>
                )}

                {/* Focus on Action Plan only if persistent blocker or not in use */}
                {selectedRecord.status !== 'in_use' && (
                  <div className="space-y-6 animate-in slide-in-from-top-2">
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Plano de Ação para Ativação</Label>
                      <Textarea
                        value={selectedRecord.action_plan || ''}
                        onChange={(e) => setSelectedRecord({...selectedRecord, action_plan: e.target.value})}
                        placeholder="Quais passos serão tomados para mitigar o bloqueio?"
                        className="bg-black/20 border-white/5 text-white min-h-[80px] rounded-xl focus:border-emerald-500"
                      />
                    </div>
                    
                    <div className="grid grid-cols-2 gap-6">
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Responsável pela Ação</Label>
                        <Input
                          value={selectedRecord.action_owner || ''}
                          onChange={(e) => setSelectedRecord({...selectedRecord, action_owner: e.target.value})}
                          placeholder="Ex: Time de Produto, CSM, Cliente..."
                          className="bg-black/20 border-white/5 text-white h-11 rounded-xl focus:border-emerald-500"
                        />
                      </div>
                      <div className="space-y-2">
                        <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Prioridade da Ação</Label>
                        <div className="flex gap-2">
                          {priorityOptions.map(p => (
                            <button
                              key={p.value}
                              onClick={() => setSelectedRecord({...selectedRecord, priority_level: p.value as any})}
                              className={cn(
                                "flex-1 p-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all",
                                selectedRecord.priority_level === p.value
                                  ? "bg-white/10 border-white/20 text-white"
                                  : "bg-black/20 border-white/5 text-slate-500 hover:text-slate-300"
                              )}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-2">
                      <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Status da Ação</Label>
                      <div className="flex gap-2">
                        {actionStatuses.map(s => (
                          <button
                            key={s.value}
                            onClick={() => setSelectedRecord({...selectedRecord, action_status: s.value as any})}
                            className={cn(
                              "flex-1 p-2 rounded-lg border text-[9px] font-bold uppercase tracking-widest transition-all",
                              selectedRecord.action_status === s.value
                                ? "bg-white/10 border-white/20 text-white"
                                : "bg-black/20 border-white/5 text-slate-500 hover:text-slate-300"
                            )}
                          >
                            {s.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                <div className="space-y-2 border-t border-white/5 pt-6">
                  <Label className="text-[10px] font-bold uppercase tracking-widest text-slate-400 ml-1">Observações Gerais</Label>
                  <Textarea
                    value={selectedRecord.observation || ''}
                    onChange={(e) => setSelectedRecord({...selectedRecord, observation: e.target.value})}
                    placeholder="Notas adicionais sobre o progresso..."
                    className="bg-black/20 border-white/5 text-white min-h-[60px] rounded-xl focus:border-plannera-orange"
                  />
                </div>
              </div>
            )}
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
