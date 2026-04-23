'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogTrigger } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Pencil, Loader2 } from 'lucide-react'
import { MaskedInput } from '@/components/ui/masked-input'
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
  notes: z.string().optional(),
  description: z.string().optional(),
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

  const INPUT = "h-11 rounded-xl bg-accent/30 border-border focus-visible:ring-primary shadow-inner"
  const LABEL = "text-[10px] font-black text-muted-foreground uppercase tracking-widest ml-1"

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
      <DialogContent className="bg-background border-border text-foreground max-w-lg rounded-2xl shadow-2xl p-0 overflow-hidden">
        <DialogHeader className="p-6 pb-0">
          <DialogTitle className="text-xl font-black uppercase tracking-tighter">Editar Contrato</DialogTitle>
          <DialogDescription className="text-muted-foreground text-xs font-medium">
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
              {errors.contracted_hours_monthly && <p className="text-destructive text-[10px] font-bold ml-1">{errors.contracted_hours_monthly.message}</p>}
            </div>
            <div className="space-y-2">
              <Label className={LABEL}>Custo Hora CSM</Label>
              <MaskedInput 
                maskType="currency"
                value={watch('csm_hour_cost')}
                onValueChange={(v) => setValue('csm_hour_cost', parseFloat(v) || 0)}
                className={INPUT}
              />
              {errors.csm_hour_cost && <p className="text-destructive text-[10px] font-bold ml-1">{errors.csm_hour_cost.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label className={LABEL}>Produto / Descrição</Label>
            <Input {...register('description')} className={INPUT} placeholder="Ex: Licenciamento Enterprise + Suporte Premium" />
            {errors.description && <p className="text-destructive text-[10px] font-bold ml-1">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label className={LABEL}>Notas Estratégicas</Label>
            <Textarea {...register('notes')} className="min-h-[100px] bg-accent/30 border-border rounded-xl shadow-inner text-sm" placeholder="Detalhes específicos da negociação ou do contrato..." />
            {errors.notes && <p className="text-destructive text-[10px] font-bold ml-1">{errors.notes.message}</p>}
          </div>
        </form>

        <DialogFooter className="p-6 bg-accent/30 border-t border-border flex items-center justify-between">
          <Button type="button" variant="ghost" onClick={() => setOpen(false)} className="rounded-xl font-bold">
            Descartar
          </Button>
          <Button type="submit" disabled={loading} onClick={handleSubmit(onSubmit)} variant="premium" className="px-6 rounded-xl shadow-lg">
            {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : "Salvar Alterações"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
