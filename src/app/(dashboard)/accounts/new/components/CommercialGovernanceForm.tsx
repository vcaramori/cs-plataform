'use client'

import { Plus, Trash2, ShieldCheck, TrendingDown, Scale } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { MaskedInput } from '@/components/ui/masked-input'

const INPUT = 'bg-background/50 border-border/60 text-content-primary h-11 rounded-2xl text-sm font-medium focus-visible:ring-primary/30 transition-all placeholder:text-content-secondary/50 shadow-sm'
const LABEL = 'label-premium'

interface CommercialGovernanceFormProps {
  rules: any[]
  contracts: any[]
  onChange: (rules: any[]) => void
}

export function CommercialGovernanceForm({ rules, contracts, onChange }: CommercialGovernanceFormProps) {
  const addRule = (type: 'discount' | 'penalty') => {
    onChange([
      ...rules,
      {
        id: crypto.randomUUID(),
        rule_type: type,
        sub_type: type === 'discount' ? 'percentage' : 'fixed',
        label: type === 'discount' ? 'Novo Desconto' : 'Nova Multa',
        value: 0,
        contract_id: null,
        starts_at: '',
        ends_at: '',
        config: { stages: [] },
        is_active: true,
      },
    ])
  }

  const removeRule = (id: string) => {
    onChange(rules.filter((rule) => rule.id !== id))
  }

  const updateRule = (id: string, updates: any) => {
    onChange(rules.map((rule) => (rule.id === id ? { ...rule, ...updates } : rule)))
  }

  const addStage = (rule: any) => {
    const stages = rule.config?.stages || []
    updateRule(rule.id, {
      config: {
        ...rule.config,
        stages: [
          ...stages,
          {
            label: `Ano ${stages.length + 1}`,
            discount: 0,
            type: 'percentage',
            starts_at: '',
            ends_at: '',
          },
        ],
      },
    })
  }

  const updateStage = (rule: any, stageIndex: number, updates: any) => {
    const stages = [...(rule.config?.stages || [])]
    stages[stageIndex] = { ...stages[stageIndex], ...updates }
    updateRule(rule.id, { config: { ...rule.config, stages } })
  }

  const removeStage = (rule: any, stageIndex: number) => {
    const stages = (rule.config?.stages || []).filter((_: any, idx: number) => idx !== stageIndex)
    updateRule(rule.id, { config: { ...rule.config, stages } })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-sm font-black text-content-primary uppercase tracking-tight">Governanca Comercial</h3>
          <p className="text-[10px] text-content-secondary font-bold uppercase tracking-widest">Gestao de descontos, multas e fidelidade</p>
        </div>
        <div className="flex gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addRule('discount')}
            className="h-8 label-premium gap-2"
          >
            <TrendingDown className="w-3 h-3" /> Add Desconto
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => addRule('penalty')}
            className="h-8 label-premium gap-2"
          >
            <Scale className="w-3 h-3" /> Add Multa
          </Button>
        </div>
      </div>

      <div className="grid gap-4">
        {rules.length === 0 && (
          <div className="p-8 border-2 border-dashed border-border-divider rounded-2xl flex flex-col items-center justify-center text-center space-y-2">
            <ShieldCheck className="w-8 h-8 text-content-secondary opacity-20" />
            <p className="text-xs text-content-secondary font-bold uppercase">Nenhuma regra de governanca aplicada</p>
          </div>
        )}

        {rules.map((rule) => (
          <div key={rule.id} className="p-5 rounded-2xl border border-border-divider bg-surface-card/80 shadow-sm space-y-4 relative group">
            <Button
              type="button"
              variant="ghost"
              size="icon"
              onClick={() => removeRule(rule.id)}
              className="absolute top-2 right-2 w-8 h-8 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-xl"
            >
              <Trash2 className="w-4 h-4" />
            </Button>

            <div className="grid grid-cols-12 gap-4 pr-10">
              <div className="col-span-12 md:col-span-4 space-y-2">
                <Label className={LABEL}>Titulo da Regra</Label>
                <Input
                  value={rule.label || ''}
                  onChange={(e) => updateRule(rule.id, { label: e.target.value })}
                  className={INPUT}
                  placeholder="Ex: Desconto Ano 1"
                />
              </div>

              <div className="col-span-12 md:col-span-4 space-y-2">
                <Label className={LABEL}>Contrato</Label>
                <Select
                  value={rule.contract_id || 'global'}
                  onValueChange={(v) => updateRule(rule.id, { contract_id: v === 'global' || v.startsWith('draft-contract-') ? null : v })}
                >
                  <SelectTrigger className={INPUT}>
                    <SelectValue placeholder="Global" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="global">Global (Toda a Conta)</SelectItem>
                    {contracts.map((contract, contractIndex) => {
                      const contractValue = contract.id || contract.contract_id || `draft-contract-${contractIndex}`

                      return (
                        <SelectItem key={contractValue} value={contractValue}>
                          Contrato: {contract.description || contract.service_type || `Rascunho ${contractIndex + 1}`}
                        </SelectItem>
                      )
                    })}
                  </SelectContent>
                </Select>
              </div>

              <div className="col-span-12 md:col-span-4 space-y-2">
                <Label className={LABEL}>Tipo de Regra</Label>
                <Select value={rule.sub_type} onValueChange={(v) => updateRule(rule.id, { sub_type: v })}>
                  <SelectTrigger className={INPUT}>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {rule.rule_type === 'discount' ? (
                      <>
                        <SelectItem value="percentage">Porcentagem (%)</SelectItem>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        <SelectItem value="progressive">Progressivo (Escada)</SelectItem>
                      </>
                    ) : (
                      <>
                        <SelectItem value="fixed">Valor Fixo (R$)</SelectItem>
                        <SelectItem value="fidelity_penalty">Multa de Fidelidade</SelectItem>
                      </>
                    )}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {rule.sub_type !== 'progressive' && (
              <div className="grid grid-cols-12 gap-4">
                <div className="col-span-12 md:col-span-4 space-y-2">
                  <Label className={LABEL}>Valor {rule.sub_type === 'percentage' ? '(%)' : '(R$)'}</Label>
                  <MaskedInput
                    maskType={rule.sub_type === 'percentage' ? 'number' : 'currency'}
                    value={rule.value ?? 0}
                    onValueChange={(v) => updateRule(rule.id, { value: Number(v) || 0 })}
                    className={INPUT}
                  />
                </div>
                <div className="col-span-12 md:col-span-4 space-y-2">
                  <Label className={LABEL}>Inicio da Vigencia</Label>
                  <Input
                    type="date"
                    value={rule.starts_at || ''}
                    onChange={(e) => updateRule(rule.id, { starts_at: e.target.value })}
                    className={INPUT}
                  />
                </div>
                <div className="col-span-12 md:col-span-4 space-y-2">
                  <Label className={LABEL}>{rule.rule_type === 'penalty' ? 'Fim da Fidelizacao' : 'Fim do Desconto'}</Label>
                  <Input
                    type="date"
                    value={rule.ends_at || ''}
                    onChange={(e) => updateRule(rule.id, { ends_at: e.target.value })}
                    className={INPUT}
                  />
                </div>
              </div>
            )}

            {rule.sub_type === 'progressive' && (
              <div className="space-y-4 pt-4 border-t border-border-divider">
                <div className="grid grid-cols-12 gap-4 items-end">
                  <div className="col-span-12 md:col-span-8">
                    <Label className={LABEL}>Estagios de desconto com vigencia propria</Label>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => addStage(rule)}
                    className="col-span-12 md:col-span-4 h-10 text-[8px] font-black uppercase tracking-widest text-indigo-400 hover:text-indigo-300 hover:bg-indigo-500/10"
                  >
                    <Plus className="w-3 h-3 mr-1" /> Add Estagio
                  </Button>
                </div>

                <div className="grid gap-2">
                  {(rule.config?.stages || []).map((stage: any, stageIndex: number) => (
                    <div key={stageIndex} className="grid grid-cols-12 gap-2 items-end">
                      <div className="col-span-12 md:col-span-3 space-y-1">
                        <Label className="label-premium">Label</Label>
                        <Input
                          value={stage.label || ''}
                          onChange={(e) => updateStage(rule, stageIndex, { label: e.target.value })}
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-6 md:col-span-2 space-y-1">
                        <Label className="label-premium">Inicio</Label>
                        <Input
                          type="date"
                          value={stage.starts_at || ''}
                          onChange={(e) => updateStage(rule, stageIndex, { starts_at: e.target.value })}
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-6 md:col-span-2 space-y-1">
                        <Label className="label-premium">Fim</Label>
                        <Input
                          type="date"
                          value={stage.ends_at || ''}
                          onChange={(e) => updateStage(rule, stageIndex, { ends_at: e.target.value })}
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-5 md:col-span-1 space-y-1">
                        <Label className="label-premium">Tipo</Label>
                        <Select
                          value={stage.type || 'percentage'}
                          onValueChange={(v) => updateStage(rule, stageIndex, { type: v })}
                        >
                          <SelectTrigger className="h-8 rounded-lg text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="percentage">%</SelectItem>
                            <SelectItem value="fixed">R$</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="col-span-5 md:col-span-3 space-y-1">
                        <Label className="label-premium">Desconto {stage.type === 'fixed' ? '(R$)' : '(%)'}</Label>
                        <MaskedInput
                          maskType={stage.type === 'fixed' ? 'currency' : 'number'}
                          value={stage.discount ?? 0}
                          onValueChange={(v) => updateStage(rule, stageIndex, { discount: Number(v) || 0 })}
                          className="h-8 rounded-lg text-xs"
                        />
                      </div>
                      <div className="col-span-2">
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          onClick={() => removeStage(rule, stageIndex)}
                          className="w-8 h-8 text-red-500/50 hover:text-red-500 hover:bg-red-500/10 rounded-lg"
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  )
}


