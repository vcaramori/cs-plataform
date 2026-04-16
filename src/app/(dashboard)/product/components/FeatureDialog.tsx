'use client'

import { useState } from 'react'
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
import { Switch } from '@/components/ui/switch'
import { Plus, Settings2, Loader2, Sparkles } from 'lucide-react'
import { toast } from 'sonner'

const featureSchema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  module: z.string().min(2, 'Módulo deve ter pelo menos 2 caracteres'),
  description: z.string().optional(),
  is_active: z.boolean().default(true),
})

type FeatureFormData = z.infer<typeof featureSchema>

interface Feature {
  id: string
  name: string
  module: string
  description: string | null
  is_active: boolean
}

export function FeatureDialog({ 
  feature, 
  onSuccess 
}: { 
  feature?: Feature
  onSuccess?: () => void 
}) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const router = useRouter()

  const { register, handleSubmit, setValue, watch, formState: { errors }, reset } = useForm<FeatureFormData>({
    resolver: zodResolver(featureSchema) as any,
    defaultValues: {
      name: feature?.name || '',
      module: feature?.module || '',
      description: feature?.description || '',
      is_active: feature?.is_active ?? true,
    },
  })

  async function onSubmit(data: FeatureFormData) {
    setLoading(true)
    try {
      const url = feature ? `/api/product/features/${feature.id}` : '/api/product/features'
      const method = feature ? 'PATCH' : 'POST'

      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar funcionalidade')
      }

      toast.success(feature ? 'Funcionalidade atualizada!' : 'Funcionalidade criada!')
      setOpen(false)
      if (!feature) reset()
      if (onSuccess) onSuccess()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {feature ? (
          <Button variant="ghost" size="icon" className="hover:bg-plannera-orange/10 text-slate-400 hover:text-plannera-orange">
            <Settings2 className="w-4 h-4" />
          </Button>
        ) : (
          <Button className="bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold uppercase tracking-widest h-10 rounded-xl gap-2">
            <Plus className="w-4 h-4" />
            Nova Funcionalidade
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-lg">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-plannera-orange" />
            {feature ? 'Editar Funcionalidade' : 'Nova Funcionalidade'}
          </DialogTitle>
          <DialogDescription className="text-slate-400">
            {feature 
              ? 'Ajuste os detalhes técnicos desta funcionalidade do produto.' 
              : 'Cadastre uma nova funcionalidade que poderá ser vinculada a planos.'
            }
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="space-y-4">
            <div className="space-y-2">
              <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">Nome da Funcionalidade *</Label>
              <Input
                {...register('name')}
                placeholder="Ex: Dashboards Customizados"
                className="bg-black/20 border-white/5 text-white placeholder:text-slate-700 h-11 rounded-xl focus:border-plannera-orange"
              />
              {errors.name && <p className="text-red-500 text-[10px] uppercase font-bold">{errors.name.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">Módulo / Categoria *</Label>
              <Input
                {...register('module')}
                placeholder="Ex: Analytics"
                className="bg-black/20 border-white/5 text-white placeholder:text-slate-700 h-11 rounded-xl focus:border-plannera-orange"
              />
              {errors.module && <p className="text-red-500 text-[10px] uppercase font-bold">{errors.module.message}</p>}
            </div>

            <div className="space-y-2">
              <Label className="text-slate-400 text-[10px] font-bold uppercase tracking-widest ml-1">Descrição Curta</Label>
              <Textarea
                {...register('description')}
                placeholder="Descreva o valor desta funcionalidade..."
                className="bg-black/20 border-white/5 text-white placeholder:text-slate-700 min-h-[100px] rounded-xl focus:border-plannera-orange"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-xl bg-black/20 border border-white/5">
              <div className="space-y-0.5">
                <Label className="text-white text-xs font-bold uppercase">Status de Ativação</Label>
                <p className="text-slate-500 text-[10px]">Determina se a funcionalidade pode ser usada em novos planos.</p>
              </div>
              <Switch
                checked={watch('is_active')}
                onCheckedChange={(val) => setValue('is_active', val)}
              />
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
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
              className="bg-plannera-orange hover:bg-plannera-orange/90 text-white min-w-[140px] font-bold uppercase text-[10px] tracking-widest h-11 rounded-xl"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              {feature ? 'Salvar Alterações' : 'Criar Funcionalidade'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
