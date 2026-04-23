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
        throw new Error(err.error ?? 'Erro ao salvar')
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
      <DialogContent className="bg-surface-card border-border-divider text-content-primary max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-9 h-9 rounded-xl bg-plannera-orange/10 border border-plannera-orange/20 flex items-center justify-center">
              <UserPlus className="w-4 h-4 text-plannera-orange" />
            </div>
            <div>
              <DialogTitle className="text-content-primary text-base font-bold uppercase tracking-tight">
                Adicionar Stakeholder
              </DialogTitle>
              <DialogDescription className="text-content-secondary text-[10px] font-bold uppercase tracking-wide mt-0">
                Mapa de Influência
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 pt-2">

          {/* Nome e Sobrenome */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-content-secondary text-[10px] font-bold uppercase tracking-wide">Nome *</Label>
              <Input
                {...register('firstName')}
                className="bg-surface-background border-border-divider text-content-primary h-9"
                placeholder="João"
              />
              {errors.firstName && <p className="text-red-400 text-[10px]">{errors.firstName.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-content-secondary text-[10px] font-bold uppercase tracking-wide">Sobrenome *</Label>
              <Input
                {...register('lastName')}
                className="bg-surface-background border-border-divider text-content-primary h-9"
                placeholder="Silva"
              />
              {errors.lastName && <p className="text-red-400 text-[10px]">{errors.lastName.message}</p>}
            </div>
          </div>

          {/* Cargo */}
          <div className="space-y-1.5">
            <Label className="text-content-secondary text-[10px] font-bold uppercase tracking-wide">Cargo *</Label>
            <Input
              {...register('role')}
              className="bg-surface-background border-border-divider text-content-primary h-9"
              placeholder="Head de TI, CEO, Gerente de Projetos..."
            />
            {errors.role && <p className="text-red-400 text-[10px]">{errors.role.message}</p>}
          </div>

          {/* Senioridade e Nível de Influência */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-content-secondary text-[10px] font-bold uppercase tracking-wide">Senioridade</Label>
              <SearchableSelect
                value={watch('seniority')}
                onValueChange={v => setValue('seniority', v as any)}
                options={['C-Level', 'VP', 'Director', 'Manager', 'IC'].map(s => ({ label: s, value: s }))}
              />
            </div>
            <div className="space-y-1.5">
              <Label className="text-content-secondary text-[10px] font-bold uppercase tracking-wide">Nível de Influência</Label>
              <SearchableSelect
                value={watch('influence_level')}
                onValueChange={v => setValue('influence_level', v as any)}
                options={[
                  { label: 'Campeão', value: 'Campeão' },
                  { label: 'Neutro', value: 'Neutro' },
                  { label: 'Detrator', value: 'Detrator' },
                  { label: 'Bloqueador', value: 'Bloqueador' },
                ]}
              />
            </div>
          </div>

          {/* E-mail e Telefone */}
          <div className="grid grid-cols-2 gap-3">
            <div className="space-y-1.5">
              <Label className="text-content-secondary text-[10px] font-bold uppercase tracking-wide">E-mail</Label>
              <Input
                {...register('email')}
                type="email"
                className="bg-surface-background border-border-divider text-content-primary h-9"
                placeholder="joao@empresa.com"
              />
              {errors.email && <p className="text-red-400 text-[10px]">{errors.email.message}</p>}
            </div>
            <div className="space-y-1.5">
              <Label className="text-content-secondary text-[10px] font-bold uppercase tracking-wide">Telefone</Label>
              <MaskedInput
                maskType="phone"
                value={watch('phone')}
                onValueChange={(v) => setValue('phone', v)}
                placeholder="(00) 00000-0000"
                className="h-9"
              />
            </div>
          </div>

          {/* LinkedIn e Foto */}
          <div className="space-y-1.5">
            <Label className="text-content-secondary text-[10px] font-bold uppercase tracking-wide">
              URL do LinkedIn
              <span className="ml-1 text-content-secondary normal-case font-medium">— foto carregada automaticamente</span>
            </Label>
            <Input
              {...register('linkedin_url')}
              className="bg-surface-background border-border-divider text-content-primary h-9"
              placeholder="https://linkedin.com/in/joaosilva"
            />
            {errors.linkedin_url && <p className="text-red-400 text-[10px]">{errors.linkedin_url.message}</p>}
          </div>

          {/* Tomador de decisão */}
          <label className="flex items-center gap-3 cursor-pointer group">
            <div
              onClick={() => setValue('decision_maker', !watch('decision_maker'))}
              className={`w-10 h-5 rounded-full transition-all relative ${watch('decision_maker') ? 'bg-plannera-orange' : 'bg-border-divider'}`}
            >
              <div className={`absolute top-0.5 w-4 h-4 rounded-full bg-white shadow transition-all ${watch('decision_maker') ? 'left-5' : 'left-0.5'}`} />
            </div>
            <span className="text-content-primary text-sm font-bold group-hover:text-content-primary transition-colors">
              Tomador de decisão
            </span>
          </label>

          <div className="flex justify-end gap-2 pt-2 border-t border-border-divider">
            <Button type="button" variant="ghost" onClick={onClose} className="text-content-secondary hover:text-content-primary">
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={loading}
              className="bg-plannera-orange hover:bg-plannera-orange/90 text-white font-bold gap-2"
            >
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Salvar Stakeholder
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
