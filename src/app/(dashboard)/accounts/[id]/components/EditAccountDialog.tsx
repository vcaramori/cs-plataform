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
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ImageUpload } from '@/components/ui/image-upload'
import { Settings2, Loader2 } from 'lucide-react'
import { MaskedInput } from '@/components/ui/masked-input'
import { toast } from 'sonner'
import type { Account } from '@/lib/supabase/types'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter pelo menos 2 caracteres'),
  segment: z.enum(['Indústria', 'MRO', 'Varejo']),
  industry: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  logo_url: z.string().url().optional().nullable(),
  tax_id: z.string().optional().nullable(),
  plan_id: z.string().uuid().optional().nullable(),
})

type FormData = z.infer<typeof schema>

export function EditAccountDialog({ account }: { account: Account }) {
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const [plans, setPlans] = useState<any[]>([])
  const router = useRouter()

  useEffect(() => {
    if (open) {
      fetchPlans()
    }
  }, [open])

  async function fetchPlans() {
    try {
      const [plansRes, accountPlanRes] = await Promise.all([
        fetch('/api/product/plans'),
        fetch(`/api/accounts/${account.id}/plan`)
      ])
      
      if (plansRes.ok) {
        const data = await plansRes.json()
        setPlans(data)
      }

      if (accountPlanRes.ok) {
        const data = await accountPlanRes.json()
        if (data && data.plan_id) {
          setValue('plan_id', data.plan_id)
        }
      }
    } catch (e) {
      console.error('Error fetching plans:', e)
    }
  }

  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      name: account.name,
      segment: account.segment as any,
      industry: account.industry || '',
      website: account.website || '',
      logo_url: account.logo_url ?? undefined,
      tax_id: (account as any).tax_id || '',
      plan_id: null,
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch(`/api/accounts/${account.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })

      // Update plan if changed
      if (data.plan_id) {
        await fetch(`/api/accounts/${account.id}/plan`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ plan_id: data.plan_id }),
        })
      }

      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao atualizar conta')
      }

      toast.success('Conta atualizada com sucesso!')
      setOpen(false)
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
        <Button variant="outline" size="sm" className="bg-slate-900 border-slate-800 text-slate-400 hover:text-white">
          <Settings2 className="w-4 h-4 mr-2" />
          Editar Conta
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-slate-950 border-slate-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle>Editar Informações da Conta</DialogTitle>
          <DialogDescription className="text-slate-400">
            Atualize os dados primários da empresa e o logotipo.
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6 pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-4">
              <div className="space-y-1.5 text-center">
                <Label className="text-slate-300 w-full text-left">Logotipo</Label>
                <ImageUpload
                  value={watch('logo_url') ?? undefined}
                  onChange={(url) => setValue('logo_url', url)}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-name" className="text-slate-300">Nome da Empresa *</Label>
                <Input
                  id="edit-name"
                  {...register('name')}
                  placeholder="Ex: General Mills"
                  className="bg-slate-900 border-slate-800 text-white"
                />
                {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">Segmento *</Label>
                <SearchableSelect
                  value={watch('segment')}
                  onValueChange={(v) => setValue('segment', v as any)}
                  options={[
                    { label: 'Indústria', value: 'Indústria' },
                    { label: 'MRO', value: 'MRO' },
                    { label: 'Varejo', value: 'Varejo' },
                  ]}
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-industry" className="text-slate-300">Setor / Indústria</Label>
                <Input
                  id="edit-industry"
                  {...register('industry')}
                  placeholder="Ex: Bens de Consumo"
                  className="bg-slate-900 border-slate-800 text-white"
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="edit-website" className="text-slate-300">Website</Label>
                <Input
                  id="edit-website"
                  {...register('website')}
                  placeholder="https://exemplo.com"
                  className="bg-slate-900 border-slate-800 text-white"
                />
                {errors.website && <p className="text-red-500 text-xs">{errors.website.message}</p>}
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300">CNPJ / TAX ID</Label>
                <MaskedInput 
                  maskType="tax_id"
                  value={watch('tax_id') ?? ''}
                  onValueChange={(v) => setValue('tax_id', v)}
                  placeholder="00.000.000/0000-00"
                />
              </div>

              <div className="space-y-1.5">
                <Label className="text-slate-300">Plano de Assinatura</Label>
                <SearchableSelect
                  value={watch('plan_id') || ''}
                  onValueChange={(v) => setValue('plan_id', v)}
                  options={[
                    { label: 'Nenhum Plano', value: '' },
                    ...plans.map(p => ({ label: p.name, value: p.id }))
                  ]}
                />
                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-tight">Define as funcionalidades liberadas contratualmente.</p>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <Button
              type="button"
              variant="ghost"
              onClick={() => setOpen(false)}
              className="text-slate-400 hover:text-white"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[120px]"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : null}
              Salvar Alterações
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
