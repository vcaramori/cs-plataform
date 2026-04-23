'use client'

import { useState } from 'react'
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
import { Plus, Loader2 } from 'lucide-react'
import { toast } from 'sonner'

const schema = z.object({
  contract_type: z.enum(['initial', 'additive', 'migration', 'renewal']),
  service_type: z.enum(['Basic', 'Professional', 'Enterprise', 'Custom']),
  mrr: z.preprocess(v => parseFloat(String(v)), z.number().positive('MRR deve ser positivo')),
  start_date: z.string().min(1, 'Informe a data de início'),
  renewal_date: z.string().min(1, 'Informe a data de renovação'),
  contracted_hours_monthly: z.preprocess(v => parseFloat(String(v)), z.number().min(0)),
  csm_hour_cost: z.preprocess(v => parseFloat(String(v)), z.number().min(0)),
  notes: z.string().optional(),
  description: z.string().optional(),
})

type FormData = z.infer<typeof schema>

export function NewContractDialog({ accountId }: { accountId: string }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      contract_type: 'initial',
      service_type: 'Professional',
      contracted_hours_monthly: 0,
      csm_hour_cost: 0,
    }
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...data, account_id: accountId }),
      })

      const result = await res.json()

      if (!res.ok) {
        throw new Error(result.error ?? 'Erro ao salvar contrato')
      }

      toast.success('Contrato/Aditivo registrado com sucesso!')
      setOpen(false)
      reset()
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
        {/* Botão compacto para caber inline na seção Governance sem sobrepor */}
        <button
          className="w-7 h-7 flex items-center justify-center rounded-lg bg-plannera-orange/10 hover:bg-plannera-orange/20 border border-plannera-orange/30 text-plannera-orange transition-all hover:scale-105 active:scale-95"
          title="Novo Produto/Contrato"
        >
          <Plus className="w-3.5 h-3.5" />
        </button>
      </DialogTrigger>
      <DialogContent className="bg-surface-card border-border-divider text-content-primary max-w-lg">
        <DialogHeader>
          <DialogTitle>Registrar Novo Produto/Contrato</DialogTitle>
          <DialogDescription className="text-content-secondary">
            Adicione uma nova solução (ex: S&OP, Abast) contendo seu próprio histórico e vigência. Para aditivar um contrato existente, clique no botão &quot;Atualizar / Aditivo&quot; no card correspondente.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 py-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Tipo de Registro</Label>
              <SearchableSelect
                value={watch('contract_type') || 'initial'}
                onValueChange={(v) => setValue('contract_type', v as any)}
                options={[
                  { label: 'Contrato Inicial', value: 'initial' },
                  { label: 'Aditivo', value: 'additive' },
                  { label: 'Migração de Plano', value: 'migration' },
                  { label: 'Renovação', value: 'renewal' }
                ]}
              />
            </div>
            <div className="space-y-2">
              <Label>Plano de Serviço</Label>
              <SearchableSelect
                value={watch('service_type') || 'Professional'}
                onValueChange={(v) => setValue('service_type', v as any)}
                options={[
                  { label: 'Basic', value: 'Basic' },
                  { label: 'Professional', value: 'Professional' },
                  { label: 'Enterprise', value: 'Enterprise' },
                  { label: 'Custom', value: 'Custom' }
                ]}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>MRR (R$)</Label>
              <Input {...register('mrr')} type="number" step="0.01" className="bg-surface-background border-border-divider" />
              {errors.mrr && <p className="text-red-400 text-xs">{errors.mrr.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Horas Contratadas/Mês</Label>
              <Input {...register('contracted_hours_monthly')} type="number" step="0.5" className="bg-surface-background border-border-divider" />
              {errors.contracted_hours_monthly && <p className="text-red-400 text-xs">{errors.contracted_hours_monthly.message}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Data de Início</Label>
              <Input {...register('start_date')} type="date" className="bg-surface-background border-border-divider" />
              {errors.start_date && <p className="text-red-400 text-xs">{errors.start_date.message}</p>}
            </div>
            <div className="space-y-2">
              <Label>Data de Renovação</Label>
              <Input {...register('renewal_date')} type="date" className="bg-surface-background border-border-divider" />
              {errors.renewal_date && <p className="text-red-400 text-xs">{errors.renewal_date.message}</p>}
            </div>
          </div>

          <div className="space-y-2">
            <Label>Produto / Descrição</Label>
            <Input {...register('description')} placeholder="Ex: S&OP, S&OE, Abast..." className="bg-surface-background border-border-divider" />
            {errors.description && <p className="text-red-400 text-xs">{errors.description.message}</p>}
          </div>

          <div className="space-y-2">
            <Label>Notas do Aditivo</Label>
            <Textarea {...register('notes')} placeholder="Detalhes adicionais..." className="bg-surface-background border-border-divider" />
            {errors.notes && <p className="text-red-400 text-xs">{errors.notes.message}</p>}
          </div>

          <DialogFooter>
            <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700">
              {loading && <Loader2 className="w-4 h-4 animate-spin mr-2" />}
              Salvar Registro
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
