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

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {triggerText ? (
          <Button size="sm" variant="outline" className="text-indigo-400 border-indigo-500/30 hover:bg-indigo-500/10 gap-2">
            <Pencil className="w-4 h-4" /> {triggerText}
          </Button>
        ) : (
          <Button size="icon" variant="ghost" className="h-8 w-8 text-slate-400 hover:text-indigo-400">
            <Pencil className="w-4 h-4" />
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar Contrato</DialogTitle>
          <DialogDescription className="text-slate-400">
            Corrija as informações deste registro contratual.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <SearchableSelect
                value={watch('contract_type')}
                onValueChange={(v) => setValue('contract_type', v as any)}
                options={[
                  { label: 'Inicial', value: 'initial' },
                  { label: 'Aditivo', value: 'additive' },
                  { label: 'Migração', value: 'migration' },
                  { label: 'Renovação', value: 'renewal' }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <SearchableSelect
                value={watch('status')}
                onValueChange={(v) => setValue('status', v as any)}
                options={[
                  { label: 'Ativo', value: 'active' },
                  { label: 'Em Risco', value: 'at-risk' },
                  { label: 'Churned', value: 'churned' },
                  { label: 'Em Negociação', value: 'in-negotiation' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Plano de Serviço</Label>
              <SearchableSelect
                value={watch('service_type')}
                onValueChange={(v) => setValue('service_type', v as any)}
                options={[
                  { label: 'Basic', value: 'Basic' },
                  { label: 'Professional', value: 'Professional' },
                  { label: 'Enterprise', value: 'Enterprise' },
                  { label: 'Custom', value: 'Custom' }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>MRR</Label>
              <MaskedInput 
                maskType="currency"
                value={watch('mrr')}
                onValueChange={(v) => setValue('mrr', parseFloat(v) || 0)}
              />
              {errors.mrr && <p className="text-red-400 text-xs">{errors.mrr.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input {...register('start_date')} type="date" className="bg-slate-800 border-slate-700" />
              {errors.start_date && <p className="text-red-400 text-xs">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Data de Renovação</Label>
              <Input {...register('renewal_date')} type="date" className="bg-slate-800 border-slate-700" />
              {errors.renewal_date && <p className="text-red-400 text-xs">{errors.renewal_date.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Horas Contratadas (Mês)</Label>
              <MaskedInput 
                maskType="decimal"
                value={watch('contracted_hours_monthly')}
                onValueChange={(v) => setValue('contracted_hours_monthly', parseFloat(v) || 0)}
              />
              {errors.contracted_hours_monthly && <p className="text-red-400 text-xs">{errors.contracted_hours_monthly.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Custo Hora CSM</Label>
              <MaskedInput 
                maskType="currency"
                value={watch('csm_hour_cost')}
                onValueChange={(v) => setValue('csm_hour_cost', parseFloat(v) || 0)}
              />
              {errors.csm_hour_cost && <p className="text-red-400 text-xs">{errors.csm_hour_cost.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Produto / Descrição</Label>
            <Input {...register('description')} className="bg-slate-800 border-slate-700" />
            {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Notas</Label>
            <Textarea {...register('notes')} className="bg-slate-800 border-slate-700" />
            {errors.notes && <p className="text-red-400 text-xs">{errors.notes.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar Alterações
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
