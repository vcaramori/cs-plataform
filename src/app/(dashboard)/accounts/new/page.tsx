'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'

const schema = z.object({
  name: z.string().min(2, 'Nome deve ter ao menos 2 caracteres'),
  segment: z.enum(['SMB', 'Mid-Market', 'Enterprise']),
  industry: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  // Contrato inicial
  mrr: z.preprocess(v => parseFloat(String(v)), z.number().positive('MRR deve ser positivo')),
  start_date: z.string().min(1, 'Informe a data de início'),
  renewal_date: z.string().min(1, 'Informe a data de renovação'),
  service_type: z.enum(['Basic', 'Professional', 'Enterprise', 'Custom']),
  contracted_hours_monthly: z.preprocess(v => parseFloat(String(v)), z.number().min(0)),
  csm_hour_cost: z.preprocess(v => parseFloat(String(v)), z.number().min(0)),
})

type FormData = {
  name: string
  segment: 'SMB' | 'Mid-Market' | 'Enterprise'
  industry?: string
  website?: string
  mrr: number
  start_date: string
  renewal_date: string
  service_type: 'Basic' | 'Professional' | 'Enterprise' | 'Custom'
  contracted_hours_monthly: number
  csm_hour_cost: number
}

export default function NewAccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { segment: 'Mid-Market' as const, service_type: 'Professional' as const },
  })

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError('')
    try {
      const accountRes = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name: data.name, segment: data.segment, industry: data.industry, website: data.website }),
      })
      if (!accountRes.ok) throw new Error('Erro ao criar conta')
      const account = await accountRes.json()

      const contractRes = await fetch('/api/contracts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          account_id: account.id,
          mrr: data.mrr,
          start_date: data.start_date,
          renewal_date: data.renewal_date,
          service_type: data.service_type,
          contracted_hours_monthly: data.contracted_hours_monthly,
          csm_hour_cost: data.csm_hour_cost,
        }),
      })
      if (!contractRes.ok) throw new Error('Conta criada, mas erro ao criar contrato')

      router.push(`/dashboard/accounts/${account.id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
    } finally {
      setLoading(false)
    }
  }

  function field(name: keyof FormData) {
    const err = errors[name]
    return err ? <p className="text-red-400 text-xs mt-1">{err.message as string}</p> : null
  }

  return (
    <div className="p-6 max-w-2xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Nova Conta</h1>
          <p className="text-slate-400 text-sm">Cadastre a conta e o contrato inicial</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader><CardTitle className="text-white text-base">Dados da Conta</CardTitle></CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2 space-y-1.5">
                <Label className="text-slate-300">Nome da Empresa *</Label>
                <Input {...register('name')} placeholder="Ex: Acme Corp" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                {field('name')}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Segmento *</Label>
                <Select onValueChange={v => setValue('segment', v as any)} defaultValue="Mid-Market">
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {['SMB', 'Mid-Market', 'Enterprise'].map(s => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-slate-700">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Indústria</Label>
                <Input {...register('industry')} placeholder="Ex: Tecnologia" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div className="col-span-2 space-y-1.5">
                <Label className="text-slate-300">Website</Label>
                <Input {...register('website')} placeholder="https://empresa.com" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                {field('website')}
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Contrato Inicial</CardTitle>
            <CardDescription className="text-slate-400">Defina as condições comerciais</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">MRR (R$) *</Label>
                <Input {...register('mrr')} type="number" step="0.01" placeholder="5000" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                {field('mrr')}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Tipo de Serviço *</Label>
                <Select onValueChange={v => setValue('service_type', v as any)} defaultValue="Professional">
                  <SelectTrigger className="bg-slate-800 border-slate-700 text-white">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-slate-800 border-slate-700">
                    {['Basic', 'Professional', 'Enterprise', 'Custom'].map(s => (
                      <SelectItem key={s} value={s} className="text-white hover:bg-slate-700">{s}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Data de Início *</Label>
                <Input {...register('start_date')} type="date" className="bg-slate-800 border-slate-700 text-white" />
                {field('start_date')}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Data de Renovação *</Label>
                <Input {...register('renewal_date')} type="date" className="bg-slate-800 border-slate-700 text-white" />
                {field('renewal_date')}
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Horas Contratadas/Mês</Label>
                <Input {...register('contracted_hours_monthly')} type="number" step="0.5" placeholder="20" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
              <div className="space-y-1.5">
                <Label className="text-slate-300">Custo/Hora do CSM (R$)</Label>
                <Input {...register('csm_hour_cost')} type="number" step="0.01" placeholder="150" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
              </div>
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="border-slate-700 text-slate-300 hover:bg-slate-800">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Criar Conta'}
          </Button>
        </div>
      </form>
    </div>
  )
}
