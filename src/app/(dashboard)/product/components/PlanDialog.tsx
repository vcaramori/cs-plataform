'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { zodResolver } from '@hookform/resolvers/zod'
import { useForm } from 'react-hook-form'
import * as z from 'zod'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Checkbox } from '@/components/ui/checkbox'
import { Plus, Settings2, Loader2, Layers } from 'lucide-react'
import { toast } from 'sonner'

const planSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
  feature_ids: z.array(z.string().uuid()).default([]),
})

type PlanFormData = z.infer<typeof planSchema>

interface Feature {
  id: string
  name: string
  module: string
  is_active: boolean
}

interface Plan {
  id: string
  name: string
  description: string | null
  is_active: boolean
  plan_features?: { feature_id: string }[]
}

export function PlanDialog({ 
  plan, 
  onSuccess 
}: { 
  plan?: Plan
  onSuccess?: () => void 
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [features, setFeatures] = useState<Feature[]>([])
  const [fetchingFeatures, setFetchingFeatures] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<PlanFormData>({
    resolver: zodResolver(planSchema) as any,
    defaultValues: {
      name: plan?.name || '',
      description: plan?.description || '',
      is_active: plan?.is_active ?? true,
      feature_ids: plan?.plan_features?.map(pf => pf.feature_id) || [],
    },
  })

  useEffect(() => {
    if (open) {
      fetchFeatures()
    }
  }, [open])

  async function fetchFeatures() {
    setFetchingFeatures(true)
    try {
      const res = await fetch('/api/product/features')
      if (res.ok) {
        const data = await res.json()
        setFeatures(data.filter((f: Feature) => f.is_active || (plan?.plan_features?.some(pf => pf.feature_id === f.id))))
      }
    } catch (e) {
      console.error(e)
    } finally {
      setFetchingFeatures(false)
    }
  }

  async function onSubmit(data: PlanFormData) {
    setLoading(true)
    try {
      const url = plan ? `/api/product/plans/${plan.id}` : '/api/product/plans'
      const method = plan ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar plano')
      }

      toast.success(plan ? 'Plano atualizado!' : 'Plano criado!')
      setOpen(false)
      if (!plan) reset()
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  const selectedFeatureIds = watch('feature_ids')

  const toggleFeature = (id: string) => {
    const current = [...selectedFeatureIds]
    const index = current.indexOf(id)
    if (index > -1) {
      current.splice(index, 1)
    } else {
      current.push(id)
    }
    setValue('feature_ids', current)
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {plan ? (
          <Button variant="ghost" size="icon" className="hover:bg-plannera-sop/10 text-slate-400 hover:text-plannera-sop">
            <Settings2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="bg-plannera-sop hover:bg-plannera-sop/90 text-white font-bold uppercase tracking-widest h-10 rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Novo Plano
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-white">
            <Layers className="w-5 h-5 text-plannera-sop" />
            {plan ? 'Editar Plano' : 'Novo Plano'}
          </DialogTitle>
          <DialogDescription className="text-slate-400 font-medium">
            Configure o nome do plano e quais funcionalidades estão inclusas no contrato padrão.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            <div className="space-y-4">
              <div className="space-y-2">
                <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">Nome do Plano *</Label>
                <Input
                  {...register('name')}
                  placeholder="Ex: Enterprise Plus"
                  className="bg-black/20 border-white/5 text-white placeholder:text-slate-700 h-11 rounded-xl focus:border-plannera-sop"
                />
                {errors.name && <p className="text-red-500 text-[10px] uppercase font-bold">{errors.name.message}</p>}
              </div>

              <div className="space-y-2">
                <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">Descrição</Label>
                <Textarea
                  {...register('description')}
                  placeholder="O que este plano oferece de diferencial?"
                  className="bg-black/20 border-white/5 text-white placeholder:text-slate-700 min-h-[120px] rounded-xl focus:border-plannera-sop"
                />
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">Funcionalidades do Plano</Label>
                {fetchingFeatures && <Loader2 className="w-3 h-3 animate-spin text-slate-500" />}
              </div>
              
              <div className="bg-black/20 border border-white/5 rounded-xl p-4 h-[220px] overflow-y-auto space-y-3 custom-scrollbar">
                {features.length === 0 && !fetchingFeatures ? (
                  <p className="text-slate-600 text-[10px] font-bold uppercase text-center py-10">Nenhuma funcionalidade ativa cadastrada.</p>
                ) : (
                  features.map((f) => (
                    <div key={f.id} className="flex items-start gap-3 group">
                      <Checkbox
                        id={`feat-${f.id}`}
                        checked={selectedFeatureIds.includes(f.id)}
                        onCheckedChange={() => toggleFeature(f.id)}
                        className="mt-1 border-white/20 data-[state=checked]:bg-plannera-sop data-[state=checked]:border-plannera-sop"
                      />
                      <Label 
                        htmlFor={`feat-${f.id}`} 
                        className="flex flex-col cursor-pointer"
                      >
                        <span className="text-white text-[11px] font-bold uppercase group-hover:text-plannera-sop transition-colors">{f.name}</span>
                        <span className="text-slate-500 text-[9px] font-medium uppercase tracking-tight">{f.module}</span>
                      </Label>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2 border-t border-white/5 mt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white uppercase text-[10px] font-bold tracking-widest"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-plannera-sop hover:bg-plannera-sop/90 text-white min-w-[140px] font-bold uppercase text-[10px] tracking-widest h-11 rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {plan ? 'Atualizar Plano' : 'Criar Plano'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
