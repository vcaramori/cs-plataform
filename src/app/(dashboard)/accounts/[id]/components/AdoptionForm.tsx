'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Input } from '@/components/ui/input'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, Settings2, CheckCircle2, AlertCircle, Clock, Ban, HelpCircle, User, Calendar, Save, Plus } from 'lucide-react'
import { Badge } from '@/components/ui/badge'
import { cn } from '@/lib/utils'
import { CreateTaskModal } from '@/app/(dashboard)/atividades/components/CreateTaskModal'

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
  target_date: string | null
  product_features: Feature
}

interface User {
  id: string
  email: string
}

interface AdoptionFormProps {
  selectedRecord: AdoptionRecord | null
  users: User[]
  saving: string | null
  accountId?: string
  onUpdate: (record: AdoptionRecord) => void
  onRecordChange: (record: AdoptionRecord) => void
}

export function AdoptionForm({
  selectedRecord,
  users,
  saving,
  accountId,
  onUpdate,
  onRecordChange
}: AdoptionFormProps) {
  const [taskModalOpen, setTaskModalOpen] = useState(false)
  const statusOptions = [
    { label: 'Não Iniciado', value: 'not_started', icon: Clock, color: 'text-content-secondary', bg: 'bg-surface-background' },
    { label: 'Uso Parcial', value: 'partial', icon: AlertCircle, color: 'text-yellow-400', bg: 'bg-yellow-400/10' },
    { label: 'Em Uso', value: 'in_use', icon: CheckCircle2, color: 'text-emerald-400', bg: 'bg-emerald-400/10' },
    { label: 'Bloqueado', value: 'blocked', icon: Ban, color: 'text-red-400', bg: 'bg-red-400/10' },
    { label: 'Não Aplicável', value: 'na', icon: HelpCircle, color: 'text-content-secondary', bg: 'bg-surface-background' },
  ]

  const blockerCategories = [
    { label: 'Integração Pendente', value: 'data_integration' },
    { label: 'Produto / Roadmap', value: 'product_roadmap' },
    { label: 'Processos / Pessoas', value: 'people_process' },
    { label: 'Governança', value: 'governance' },
    { label: 'Sem Relevância Estratégica', value: 'no_strategic_relevance' },
    { label: 'Outros', value: 'other' },
  ]

  if (!selectedRecord) {
    return (
      <div className="h-full flex flex-col items-center justify-center opacity-20 gap-4">
        <Settings2 className="w-16 h-16" />
        <p className="text-xs font-bold uppercase tracking-widest">Selecione uma funcionalidade para editar</p>
      </div>
    )
  }

  return (
    <div className="space-y-8 animate-in fade-in slide-in-from-right-4 duration-300 pb-10">
      <div className="flex items-center justify-between bg-surface-background p-4 rounded-2xl border border-border-divider shadow-sm sticky top-0 z-10 backdrop-blur-md">
        <div>
          <h3 className="text-xl font-black uppercase text-content-primary tracking-tight leading-tight">{selectedRecord.product_features.name}</h3>
          <p className="text-[10px] font-bold uppercase text-content-secondary tracking-widest">{selectedRecord.product_features.module}</p>
        </div>
        <Button
          onClick={() => onUpdate(selectedRecord)}
          disabled={!!saving}
          className="bg-emerald-600 hover:bg-success text-white font-bold uppercase text-[10px] tracking-widest h-11 rounded-xl px-8 shadow-[0_0_20px_rgba(5,150,105,0.2)] transition-all hover:scale-105 active:scale-95 gap-2"
        >
          {saving === selectedRecord.id ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
          Salvar
        </Button>
      </div>

      <div className="grid grid-cols-2 gap-8">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary ml-1">Status de Adoção</Label>
            <div className="grid grid-cols-1 gap-2">
              {statusOptions.map(opt => (
                <button
                  key={opt.value}
                  onClick={() => onRecordChange({...selectedRecord, status: opt.value as any})}
                  className={cn(
                    "flex items-center gap-3 p-3 rounded-xl border transition-all text-left",
                    selectedRecord.status === opt.value
                      ? "bg-surface-card border-border-divider ring-1 ring-border-divider"
                      : "bg-surface-background border-border-divider opacity-50 hover:opacity-100"
                  )}
                >
                  <opt.icon className={cn("w-4 h-4", opt.color)} />
                  <span className="text-[10px] font-bold uppercase tracking-widest text-content-primary">{opt.label}</span>
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary ml-1 flex items-center gap-2">
              <Calendar className="w-3 h-3" /> Data Alvo para Evolução
            </Label>
            <Input
              type="date"
              value={selectedRecord.target_date || ''}
              onChange={(e) => onRecordChange({...selectedRecord, target_date: e.target.value || null})}
              className="bg-surface-background border-border-divider text-content-primary h-11 rounded-xl focus:border-plannera-orange"
            />
          </div>
        </div>
      </div>

      {/* Blocker Details Section */}
      {(selectedRecord.status === 'blocked' || selectedRecord.status === 'na') && (
        <div className="p-6 rounded-2xl bg-red-500/5 border border-red-500/10 space-y-6 animate-in slide-in-from-top-2">
          <div className="flex items-center gap-2 text-red-400">
            <Ban className="w-4 h-4" />
            <h4 className="text-[10px] font-black uppercase tracking-widest">Detalhamento da Exceção / Bloqueio</h4>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary ml-1">Categoria do Bloqueio</Label>
              <SearchableSelect
                value={selectedRecord.blocker_category || ''}
                onValueChange={(v) => onRecordChange({...selectedRecord, blocker_category: v as any})}
                options={[
                  { label: 'Selecione uma categoria', value: '' },
                  ...blockerCategories
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary ml-1">Justificativa do Não Uso</Label>
              <Input
                value={selectedRecord.blocker_reason || ''}
                onChange={(e) => onRecordChange({...selectedRecord, blocker_reason: e.target.value})}
                placeholder="Ex: Falta de processo interno..."
                className="bg-surface-background border-border-divider text-content-primary h-11 rounded-xl focus:border-red-400"
              />
            </div>
          </div>
        </div>
      )}

      {/* Action Plan Section */}
      {selectedRecord.status !== 'in_use' && (
        <div className="space-y-4 animate-in slide-in-from-top-2 p-6 rounded-2xl bg-surface-background border border-border-divider">
          <div className="flex items-center justify-between">
            <Label className="text-[10px] font-bold uppercase tracking-widest text-content-primary flex items-center gap-2">
              <Settings2 className="w-3.5 h-3.5 text-plannera-orange" />
              Próximos Passos (Resumo)
            </Label>
            {accountId && (
              <Button
                type="button"
                variant="default"
                size="sm"
                className="gap-2 text-[10px] font-black uppercase tracking-wide bg-plannera-orange hover:bg-plannera-orange/90 text-white rounded-lg h-8 px-4"
                onClick={() => setTaskModalOpen(true)}
              >
                <Plus className="w-3.5 h-3.5" />
                Criar Atividade para esta Feature
              </Button>
            )}
          </div>
          <Textarea
            value={selectedRecord.action_plan || ''}
            onChange={(e) => onRecordChange({...selectedRecord, action_plan: e.target.value})}
            placeholder="Resuma o que precisa ser feito ou crie uma atividade formal no botão acima."
            className="bg-surface-card border-border-divider text-content-primary min-h-[80px] rounded-xl focus:border-plannera-orange"
          />
        </div>
      )}

      <div className="space-y-2 border-t border-border-divider pt-6">
        <Label className="text-[10px] font-bold uppercase tracking-widest text-content-secondary ml-1">Observações Gerais</Label>
        <Textarea
          value={selectedRecord.observation || ''}
          onChange={(e) => onRecordChange({...selectedRecord, observation: e.target.value})}
          placeholder="Notas adicionais sobre o progresso..."
          className="bg-surface-background border-border-divider text-content-primary min-h-[60px] rounded-xl focus:border-plannera-orange"
        />
      </div>

      {accountId && (
        <CreateTaskModal
          open={taskModalOpen}
          onOpenChange={setTaskModalOpen}
          onSaved={() => {}}
          prefill={{
            account_id: accountId,
            adoption_id: selectedRecord.id,
            source_label: 'adoption',
            title: `Ativar: ${selectedRecord.product_features.name}`,
            description: selectedRecord.action_plan ?? undefined,
          }}
        />
      )}
    </div>
  )
}
