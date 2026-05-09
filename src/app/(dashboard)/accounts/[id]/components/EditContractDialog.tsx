'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Pencil, Loader2, Plus, Trash2 } from 'lucide-react'
import { MaskedInput } from '@/components/ui/masked-input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { toast } from 'sonner'

const schema = z.object({
  contract_type: z.enum(['initial', 'additive', 'migration', 'renewal']),
  service_type: z.enum(['Basic', 'Professional', 'Enterprise', 'Custom']),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']),
  mrr: z.preprocess(v => parseFloat(String(v)), z.number().positive('MRR deve ser positivo')),
  start_date: z.string().optional().or(z.literal('')),
  renewal_date: z.string().optional().or(z.literal('')),
  contracted_hours_monthly: z.preprocess(v => parseFloat(String(v)), z.number().min(0)),
  csm_hour_cost: z.preprocess(v => parseFloat(String(v)), z.number().min(0)),
  fine_amount: z.preprocess(v => parseFloat(String(v)), z.number().min(0)),
  fidelity_months: z.preprocess(v => parseFloat(String(v)), z.number().min(0)),
  progressive_discounts: z.array(z.object({
    label: z.string(),
    discount: z.number(),
    type: z.enum(['percentage', 'fixed'])
  })).default([]),
  notes: z.string().optional().nullable(),
  description: z.string().optional().nullable(),
})

type FormData = z.infer<typeof schema>

interface EditContractDialogProps {
  contract: any
  onSuccess?: () => void
  triggerText?: string
}

export function EditContractDialog({ contract, onSuccess, triggerText }: EditContractDialogProps) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      contract_type: (contract.contract_type as any) || 'initial',
      service_type: (contract.service_type as any) || 'Professional',
      status: (contract.status as any) || 'active',
      mrr: Number(contract.mrr),
      start_date: contract.start_date || '',
      renewal_date: contract.renewal_date || '',
      contracted_hours_monthly: Number(contract.contracted_hours_monthly),
      csm_hour_cost: Number(contract.csm_hour_cost),
      fine_amount: Number(contract.fine_amount || 0),
      fidelity_months: Number(contract.fidelity_months || 0),
      progressive_discounts: contract.progressive_discounts || [],
      notes: contract.notes || '',
      description: contract.description || '',
    }
  })

  // Sincroniza se o contrato mudar externamente
  useEffect(() => {
    if (open) {
      reset({
        contract_type: (contract.contract_type as any) || 'initial',
        service_type: (contract.service_type as any) || 'Professional',
        status: (contract.status as any) || 'active',
        mrr: Number(contract.mrr),
        start_date: contract.start_date || '',
        renewal_date: contract.renewal_date || '',
        contracted_hours_monthly: Number(contract.contracted_hours_monthly),
        csm_hour_cost: Number(contract.csm_hour_cost),
        fine_amount: Number(contract.fine_amount || 0),
        fidelity_months: Number(contract.fidelity_months || 0),
        progressive_discounts: contract.progressive_discounts || [],
        notes: contract.notes || '',
        description: contract.description || '',
      })
    }
  }, [open, contract, reset])

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch(`/api/contracts/${contract.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error ?? 'Erro ao atualizar contrato')
      }

      toast.success('Contrato atualizado com sucesso!')
      setOpen(false)
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (e: any) {
      console.error('Submit Error:', e)
      toast.error(e.message || 'Ocorreu um erro inesperado ao salvar')
    } finally {
      setLoading(false)
    }
  }

  const INPUT = 'bg-surface-background0/5 dark:bg-slate-400/10 border-border/60 text-foreground h-11 rounded-2xl text-[10px] font-black uppercase tracking-widest focus-visible:ring-primary/30 transition-all placeholder:text-muted-foreground/50 shadow-sm'
  const LABEL = 'text-[10px] font-extrabold text-muted-foreground/90 uppercase tracking-widest ml-1'

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerText ? (
          <Button variant="premium" size="sm" className="gap-2 h-9 px-4 rounded-xl shadow-lg transition-all hover:scale-105 active:scale-95">
            <Pencil className="w-4 h-4" /> {triggerText}
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-lg transition-all">
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white max-w-lg rounded-2xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-8 border-b border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50">
          <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#2d3558] dark:text-white">Editar Contrato</DialogTitle>
          <DialogDescription className="text-content-secondary dark:text-content-secondary text-xs font-medium">
            Atualize os parâmetros financeiros e operacionais deste registro.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 px-6 py-6 overflow-y-auto max-h-[70vh]">
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={LABEL}>Tipo de Registro</Label>
              <SearchableSelect
                value={watch('contract_type')}
                onValueChange={(v) => setValue('contract_type', v as any)}
                className={INPUT}
                options={[
                  { label: 'Inicial', value: 'initial' },
                  { label: 'Aditivo', value: 'additive' },
                  { label: 'Migração', value: 'migration' },
                  { label: 'Renovação', value: 'renewal' }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label className={LABEL}>Status</Label>
              <SearchableSelect
                value={watch('status')}
                onValueChange={(v) => setValue('status', v as any)}
                className={INPUT}
                options={[
                  { label: 'Ativo', value: 'active' },
                  { label: 'Em Risco', value: 'at-risk' },
                  { label: 'Churned', value: 'churned' },
                  { label: 'Em Negociação', value: 'in-negotiation' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={LABEL}>Plano de Serviço</Label>
              <SearchableSelect
                value={watch('service_type')}
                onValueChange={(v) => setValue('service_type', v as any)}
                className={INPUT}
                options={[
                  { label: 'Basic', value: 'Basic' },
                  { label: 'Professional', value: 'Professional' },
                  { label: 'Enterprise', value: 'Enterprise' },
                  { label: 'Custom', value: 'Custom' }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label className={LABEL}>MRR</Label>
              <MaskedInput 
                maskType="currency"
                value={watch('mrr')}
                onValueChange={(v) => setValue('mrr', parseFloat(v) || 0)}
                className={INPUT}
              />
              {errors.mrr && <p className="text-destructive text-[10px] font-bold ml-1">{errors.mrr.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={LABEL}>Data de Início</Label>
              <Input {...register('start_date')} type="date" className={INPUT} />
              {errors.start_date && <p className="text-destructive text-[10px] font-bold ml-1">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className={LABEL}>Data de Renovação</Label>
              <Input {...register('renewal_date')} type="date" className={INPUT} />
              {errors.renewal_date && <p className="text-destructive text-[10px] font-bold ml-1">{errors.renewal_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={LABEL}>Horas Contratadas (Mês)</Label>
              <MaskedInput 
                maskType="decimal"
                value={watch('contracted_hours_monthly')}
                onValueChange={(v) => setValue('contracted_hours_monthly', parseFloat(v) || 0)}
                className={INPUT}
              />
            </div>
            <div className="space-y-2">
              <Label className={LABEL}>Custo Hora CSM</Label>
              <MaskedInput 
                maskType="currency"
                value={watch('csm_hour_cost')}
                onValueChange={(v) => setValue('csm_hour_cost', parseFloat(v) || 0)}
                className={INPUT}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label className={LABEL}>Multa Rescisória</Label>
              <MaskedInput 
                maskType="currency"
                value={watch('fine_amount')}
                onValueChange={(v) => setValue('fine_amount', parseFloat(v) || 0)}
                className={INPUT}
              />
            </div>
            <div className="space-y-2">
              <Label className={LABEL}>Fidelidade (Meses)</Label>
              <Input 
                type="number"
                {...register('fidelity_months', { valueAsNumber: true })}
                className={INPUT}
              />
            </div>
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <Label className={LABEL}>Descontos Progressivos</Label>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="h-7 text-[10px] font-extrabold uppercase tracking-widest gap-2 bg-indigo-500/10 text-indigo-400 border-indigo-500/20"
                onClick={() => {
                  const current = watch('progressive_discounts') || []
                  setValue('progressive_discounts', [
                    ...current,
                    { label: `Ano ${current.length + 1}`, discount: 0, type: 'percentage' }
                  ])
                }}
              >
                <Plus className="w-3 h-3" /> Add Estágio
              </Button>
            </div>
            <div className="space-y-2">
              {(watch('progressive_discounts') || []).map((stage, si) => (
                <div key={si} className="flex items-center gap-2 p-2 rounded-xl bg-surface-background dark:bg-slate-800/50 border border-border-divider dark:border-slate-700">
                  <Input
                    value={stage.label}
                    onChange={(e) => {
                      const current = [...(watch('progressive_discounts') || [])]
                      current[si] = { ...current[si], label: e.target.value }
                      setValue('progressive_discounts', current)
                    }}
                    className="h-8 bg-surface-background0/10 dark:bg-slate-400/20 border-none text-[10px] font-bold"
                    placeholder="Rótulo"
                  />
                  <Input
                    type="number"
                    value={stage.discount}
                    onChange={(e) => {
                      const current = [...(watch('progressive_discounts') || [])]
                      current[si] = { ...current[si], discount: parseFloat(e.target.value) || 0 }
                      setValue('progressive_discounts', current)
                    }}
                    className="h-8 w-16 text-[10px] bg-white dark:bg-slate-900 border-border-divider dark:border-slate-700"
                  />
                  <Select
                    value={stage.type}
                    onValueChange={(v: 'percentage' | 'fixed') => {
                      const current = [...(watch('progressive_discounts') || [])]
                      current[si] = { ...current[si], type: v }
                      setValue('progressive_discounts', current)
                    }}
                  >
                    <SelectTrigger className="h-8 bg-surface-background0/10 dark:bg-slate-400/20 border-none text-[10px] font-bold">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="percentage">%</SelectItem>
                      <SelectItem value="fixed">R$</SelectItem>
                    </SelectContent>
                  </Select>
                  <Button
                    type="button"
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 text-red-500 hover:text-destructive hover:bg-red-50"
                    onClick={() => {
                      const current = [...(watch('progressive_discounts') || [])]
                      current.splice(si, 1)
                      setValue('progressive_discounts', current)
                    }}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          </div>

          <div className="space-y-2">
            <Label className={LABEL}>Produto / Descrição</Label>
            <Input {...register('description')} className={INPUT} placeholder="Ex: Licenciamento Enterprise + Suporte Premium" />
            {errors.description && <p className="text-destructive text-[10px] font-bold ml-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className={LABEL}>Notas Estratégicas</Label>
            <Textarea {...register('notes')} className={cn(INPUT, "min-h-[100px] py-3")} placeholder="Detalhes específicos da negociação ou do contrato..." />
            {errors.notes && <p className="text-destructive text-[10px] font-bold ml-1">{errors.notes.message}</p>}
          </div>
        </form>

        <DialogFooter className="p-6 bg-surface-background dark:bg-slate-800/50 border-t border-border-divider dark:border-slate-800 flex items-center justify-between rounded-b-2xl">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold text-content-secondary dark:text-content-secondary hover:text-[#2d3558] dark:hover:text-white">
            Descartar
          </Button>
          <Button type="submit" disabled={loading} onClick={handleSubmit(onSubmit)} className="px-6 rounded-xl shadow-lg bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-widest">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
