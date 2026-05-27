'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { Loader2, UserPlus } from 'lucide-react'
import { MaskedInput } from '@/components/ui/masked-input'
import { toast } from 'sonner'

const schema = z.object({
  firstName: z.string().min(1, 'Informe o nome'),
  lastName: z.string().min(1, 'Informe o sobrenome'),
  role: z.string().min(1, 'Informe o cargo'),
  seniority: z.enum(['C-Level', 'VP', 'Director', 'Manager', 'IC']),
  influence_level: z.enum(['Campeão', 'Neutro', 'Detrator', 'Bloqueador']),
  email: z.string().email('E-mail inválido').optional().or(z.literal('')),
  phone: z.string().optional().or(z.literal('')),
  linkedin_url: z.string().url('URL inválida').optional().or(z.literal('')),
  decision_maker: z.boolean(),
})

type FormData = z.infer<typeof schema>

// Mapeamento para os valores aceitos pela API
const influenceMap: Record<string, string> = {
  'Campeão': 'Champion',
  'Neutro': 'Neutral',
  'Detrator': 'Detractor',
  'Bloqueador': 'Blocker',
}

export function AddContactModal({ open, onClose, accountId }: {
  open: boolean
  onClose: () => void
  accountId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  const { register, handleSubmit, setValue, watch, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: {
      seniority: 'Manager',
      influence_level: 'Neutro',
      decision_maker: false,
      email: '',
      phone: '',
      linkedin_url: '',
    },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const res = await fetch('/api/contacts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: accountId,
          name: `${data.firstName} ${data.lastName}`.trim(),
          role: data.role,
          seniority: data.seniority,
          influence_level: influenceMap[data.influence_level] ?? 'Neutral',
          decision_maker: data.decision_maker,
          email: data.email?.toLowerCase() || null,
          phone: data.phone || null,
          linkedin_url: data.linkedin_url || null,
        }),
      })
      if (!res.ok) {
        const err = await res.json()
        const msg = typeof err.error === 'string' ? err.error : JSON.stringify(err.error)
        throw new Error(msg ?? 'Erro ao salvar')
      }
      toast.success('Stakeholder adicionado!')
      reset()
      onClose()
      router.refresh()
    } catch (e: any) {
      toast.error(e.message || 'Erro inesperado')
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white max-w-3xl rounded-2xl shadow-2xl p-0 overflow-hidden flex flex-col max-h-[90vh]">
        <DialogHeader className="p-8 border-b border-border-divider dark:border-slate-800 bg-surface-background dark:bg-slate-800/50 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-xl bg-plannera-orange/10 border border-plannera-orange/20 flex items-center justify-center">
              <UserPlus className="w-6 h-6 text-plannera-orange" />
            </div>
            <div>
              <DialogTitle className="text-xl font-black uppercase tracking-tighter text-[#2d3558] dark:text-white">
                Adicionar Stakeholder
              </DialogTitle>
              <DialogDescription className="text-content-secondary dark:text-content-secondary text-xs font-medium mt-1">
                Mapa de Influência
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="flex flex-col flex-1 min-h-0">
          {/* Campos com scroll */}
          <div className="space-y-6 px-6 py-6 overflow-y-auto flex-1">

            {/* Nome e Sobrenome */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-content-secondary dark:text-content-secondary uppercase tracking-widest ml-1">Nome *</Label>
                <Input
                  {...register('firstName')}
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white shadow-sm focus-visible:ring-plannera-orange"
                  placeholder="João"
                />
                {errors.firstName && <p className="text-destructive text-[10px] font-bold ml-1">{errors.firstName.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-content-secondary dark:text-content-secondary uppercase tracking-widest ml-1">Sobrenome *</Label>
                <Input
                  {...register('lastName')}
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white shadow-sm focus-visible:ring-plannera-orange"
                  placeholder="Silva"
                />
                {errors.lastName && <p className="text-destructive text-[10px] font-bold ml-1">{errors.lastName.message}</p>}
              </div>
            </div>

            {/* Cargo, Senioridade, Influência e Tomador de Decisão Lado a Lado */}
            <div className="grid grid-cols-12 gap-6 items-end">
              <div className="col-span-4 space-y-2">
                <Label className="text-[10px] font-black text-content-secondary dark:text-content-secondary uppercase tracking-widest ml-1">Cargo *</Label>
                <Input
                  {...register('role')}
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white shadow-sm focus-visible:ring-plannera-orange"
                  placeholder="Head de TI, CEO..."
                />
                {errors.role && <p className="text-destructive text-[10px] font-bold ml-1">{errors.role.message}</p>}
              </div>

              <div className="col-span-3 space-y-2">
                <Label className="text-[10px] font-black text-content-secondary dark:text-content-secondary uppercase tracking-widest ml-1">Senioridade</Label>
                <SearchableSelect
                  value={watch('seniority')}
                  onValueChange={v => setValue('seniority', v as any)}
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white shadow-sm focus-visible:ring-plannera-orange"
                  options={['C-Level', 'VP', 'Director', 'Manager', 'IC'].map(s => ({ label: s, value: s }))}
                />
              </div>

              <div className="col-span-3 space-y-2">
                <Label className="text-[10px] font-black text-content-secondary dark:text-content-secondary uppercase tracking-widest ml-1">Nível de Influência</Label>
                <SearchableSelect
                  value={watch('influence_level')}
                  onValueChange={v => setValue('influence_level', v as any)}
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white shadow-sm focus-visible:ring-plannera-orange"
                  options={[
                    { label: 'Campeão', value: 'Campeão' },
                    { label: 'Neutro', value: 'Neutro' },
                    { label: 'Detrator', value: 'Detrator' },
                    { label: 'Bloqueador', value: 'Bloqueador' },
                  ]}
                />
              </div>

              <div className="col-span-2 pb-3">
                <label className="flex items-center gap-2 cursor-pointer group">
                  <div
                    onClick={() => setValue('decision_maker', !watch('decision_maker'))}
                    className={`w-10 h-5 rounded-full transition-all relative shrink-0 ${watch('decision_maker') ? 'bg-plannera-orange' : 'bg-surface-card dark:bg-slate-700'}`}
                  >
                    <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${watch('decision_maker') ? 'left-5' : 'left-0.5'}`} />
                  </div>
                  <span className="text-[#2d3558] dark:text-white text-[10px] font-bold uppercase tracking-wider leading-tight">
                    Decisor
                  </span>
                </label>
              </div>
            </div>

            {/* E-mail e Telefone */}
            <div className="grid grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-content-secondary dark:text-content-secondary uppercase tracking-widest ml-1">E-mail</Label>
                <Input
                  {...register('email')}
                  type="email"
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white shadow-sm focus-visible:ring-plannera-orange"
                  placeholder="joao@empresa.com"
                />
                {errors.email && <p className="text-destructive text-[10px] font-bold ml-1">{errors.email.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className="text-[10px] font-black text-content-secondary dark:text-content-secondary uppercase tracking-widest ml-1">Telefone</Label>
                <MaskedInput
                  maskType="phone"
                  value={watch('phone')}
                  onValueChange={(v) => setValue('phone', v)}
                  placeholder="(00) 00000-0000"
                  className="h-11 rounded-xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white shadow-sm focus-visible:ring-plannera-orange"
                />
                {errors.phone && <p className="text-destructive text-[10px] font-bold ml-1">{errors.phone.message}</p>}
              </div>
            </div>

            {/* LinkedIn */}
            <div className="space-y-2">
              <Label className="text-[10px] font-black text-content-secondary dark:text-content-secondary uppercase tracking-widest ml-1">
                URL do LinkedIn
                <span className="ml-1 text-content-secondary dark:text-content-secondary normal-case font-medium">— foto carregada automaticamente</span>
              </Label>
              <Input
                {...register('linkedin_url')}
                className="h-11 rounded-xl bg-white dark:bg-slate-900 border border-border-divider dark:border-slate-800 text-[#2d3558] dark:text-white shadow-sm focus-visible:ring-plannera-orange"
                placeholder="https://linkedin.com/in/joaosilva"
              />
              {errors.linkedin_url && <p className="text-destructive text-[10px] font-bold ml-1">{errors.linkedin_url.message}</p>}
            </div>
          </div>

          {/* Footer fixo dentro do form */}
          <div className="p-6 bg-surface-background dark:bg-slate-800/50 border-t border-border-divider dark:border-slate-800 flex items-center justify-between rounded-b-2xl shrink-0">
            <Button type="button" variant="ghost" onClick={onClose} className="rounded-xl font-bold text-content-secondary dark:text-content-secondary hover:text-[#2d3558] dark:hover:text-white">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="px-6 rounded-xl shadow-lg bg-plannera-orange hover:bg-plannera-orange/90 text-white font-black uppercase tracking-widest gap-2"
            >
              {loading && <Loader2 className="w-4 h-4 animate-spin" />}
              Salvar Stakeholder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
