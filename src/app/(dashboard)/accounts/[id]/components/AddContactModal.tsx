'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Loader2 } from 'lucide-react'

const schema = z.object({
  name: z.string().min(2),
  role: z.string().min(1),
  seniority: z.enum(['C-Level', 'VP', 'Director', 'Manager', 'IC']),
  influence_level: z.enum(['Champion', 'Neutral', 'Detractor', 'Blocker']),
  email: z.string().email().optional().or(z.literal('')),
  decision_maker: z.boolean(),
})

type FormData = z.infer<typeof schema>

export function AddContactModal({ open, onClose, accountId }: {
  open: boolean
  onClose: () => void
  accountId: string
}) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, reset, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { seniority: 'Manager' as const, influence_level: 'Neutral' as const, decision_maker: false },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    await fetch('/api/contacts', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, account_id: accountId }),
    })
    setLoading(false)
    reset()
    onClose()
    router.refresh()
  }

  return (
    <Dialog open={open} onOpenChange={v => { if (!v) onClose() }}>
      <DialogContent className="bg-slate-900 border-slate-800 text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Adicionar Contato</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div className="col-span-2 space-y-1.5">
              <Label className="text-slate-300 text-sm">Nome *</Label>
              <Input {...register('name')} className="bg-slate-800 border-slate-700 text-white h-9" placeholder="João Silva" />
              {errors.name && <p className="text-red-400 text-xs">{errors.name.message}</p>}
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-slate-300 text-sm">Cargo *</Label>
              <Input {...register('role')} className="bg-slate-800 border-slate-700 text-white h-9" placeholder="Head de TI" />
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Senioridade</Label>
              <Select onValueChange={v => setValue('seniority', v as any)} defaultValue="Manager">
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['C-Level', 'VP', 'Director', 'Manager', 'IC'].map(s => (
                    <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-1.5">
              <Label className="text-slate-300 text-sm">Influência</Label>
              <Select onValueChange={v => setValue('influence_level', v as any)} defaultValue="Neutral">
                <SelectTrigger className="bg-slate-800 border-slate-700 text-white h-9">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-slate-800 border-slate-700">
                  {['Champion', 'Neutral', 'Detractor', 'Blocker'].map(s => (
                    <SelectItem key={s} value={s} className="text-white">{s}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="col-span-2 space-y-1.5">
              <Label className="text-slate-300 text-sm">Email</Label>
              <Input {...register('email')} type="email" className="bg-slate-800 border-slate-700 text-white h-9" placeholder="joao@empresa.com" />
            </div>
            <div className="col-span-2 flex items-center gap-2">
              <input type="checkbox" id="dm" {...register('decision_maker')} className="rounded" />
              <Label htmlFor="dm" className="text-slate-300 text-sm cursor-pointer">Tomador de decisão</Label>
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="border-red-700 text-red-400 hover:bg-red-950 hover:text-red-300 h-9">Cancelar</Button>
            <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 h-9 gap-1.5">
              {loading && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Salvar
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
