'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ImageUpload } from '@/components/ui/image-upload'
import { MaskedInput } from '@/components/ui/masked-input'
import { ArrowLeft, Loader2 } from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'

const schema = z.object({
  client_name: z.string().min(2, 'Nome do cliente deve ter ao menos 2 caracteres'),
  account_name: z.string().min(2, 'Nome do LOGO (solução) deve ter ao menos 2 caracteres'),
  segment: z.enum(['SMB', 'Mid-Market', 'Enterprise']),
  industry: z.string().optional(),
  website: z.string().url('URL inválida').optional().or(z.literal('')),
  logo_url: z.string().optional(),
  tax_id: z.string().optional().or(z.literal('')),
  // Contrato inicial
  mrr: z.preprocess(v => parseFloat(String(v)), z.number().positive('MRR deve ser positivo')),
  start_date: z.string().min(1, 'Informe a data de início'),
  renewal_date: z.string().min(1, 'Informe a data de renovação'),
  csm_owner_id: z.string().uuid('Selecione um CSM').optional()
})

type FormData = {
  client_name: string
  account_name: string
  segment: 'SMB' | 'Mid-Market' | 'Enterprise'
  industry?: string
  website?: string
  logo_url?: string
  tax_id?: string
  mrr: number
  start_date: string
  renewal_date: string
  csm_owner_id?: string
}

type User = {
  id: string
  email: string
}

export default function NewAccountPage() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [users, setUsers] = useState<User[]>([])

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { register, handleSubmit, setValue, watch, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema) as any,
    defaultValues: { segment: 'Mid-Market' as const },
  })

  useEffect(() => {
    fetch('/api/users')
      .then(res => res.json())
      .then(data => setUsers(data))
      .catch(console.error)
  }, [])

  async function onSubmit(data: FormData) {
    setLoading(true)
    setError('')
    try {
      const accountRes = await fetch('/api/accounts', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          client_name: data.client_name, 
          account_name: data.account_name, 
          segment: data.segment, 
          industry: data.industry, 
          website: data.website,
          logo_url: data.logo_url,
          tax_id: data.tax_id,
          csm_owner_id: data.csm_owner_id,
          mrr: data.mrr,
          start_date: data.start_date,
          renewal_date: data.renewal_date,
        }),
      })

      if (!accountRes.ok) {
        const err = await accountRes.json()
        throw new Error(err.error?.fieldErrors ? 'Erro de validação nos campos' : (err.error || 'Erro ao criar LOGO/cliente'))
      }
      
      const account = await accountRes.json()

      toast.success('LOGO e contrato criados com sucesso!')
      router.push(`/accounts/${account.id}`)
      router.refresh()
    } catch (e: any) {
      setError(e.message)
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  function field(name: keyof FormData) {
    const err = errors[name]
    return err ? <p className="text-red-400 text-xs mt-1">{err.message as string}</p> : null
  }

  return (
    <div className="p-6 max-w-4xl">
      <div className="flex items-center gap-3 mb-6">
        <Link href="/dashboard">
          <Button variant="ghost" size="sm" className="text-slate-400 hover:text-white gap-1.5">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold text-white">Novo LOGO</h1>
          <p className="text-slate-400 text-sm">Cadastre o LOGO e o contrato inicial</p>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Informações do Cliente e LOGO</CardTitle>
            <CardDescription className="text-slate-400">Preencha os dados primários da empresa e a solução adquirida.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            
            {/* Bloco Cliente/Empresa */}
            <div>
              <h3 className="text-sm font-medium text-indigo-400 mb-3 uppercase tracking-wider">1. Dados da Empresa (Cliente)</h3>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                {/* Logo da Empresa */}
                <div className="md:col-span-1 space-y-1.5 flex flex-col items-center">
                  <Label className="text-slate-300 w-full text-left">Logotipo</Label>
                  <ImageUpload 
                    value={watch('logo_url')} 
                    onChange={(url) => setValue('logo_url', url)} 
                  />
                </div>

                {/* Dados em Texto */}
                <div className="md:col-span-3 grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Nome da Empresa *</Label>
                    <Input {...register('client_name')} placeholder="Ex: General Mills" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                    {field('client_name')}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Setor / Indústria</Label>
                    <Input {...register('industry')} placeholder="Ex: Bens de Consumo" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">Website</Label>
                    <Input {...register('website')} placeholder="https://generalmills.com" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                    {field('website')}
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-slate-300">CNPJ / TAX ID</Label>
                    <MaskedInput 
                      maskType="tax_id"
                      value={watch('tax_id')}
                      onValueChange={(v) => setValue('tax_id', v)}
                      placeholder="00.000.000/0000-00"
                    />
                    {field('tax_id')}
                  </div>
                </div>
              </div>
            </div>

            <div className="border-t border-slate-800" />

            {/* Bloco Conta/Solução */}
            <div>
              <h3 className="text-sm font-medium text-indigo-400 mb-3 uppercase tracking-wider">2. Dados da Solução (LOGO)</h3>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-slate-300">Nome do LOGO *</Label>
                  <Input {...register('account_name')} placeholder="Ex: Solução A" className="bg-slate-800 border-slate-700 text-white placeholder:text-slate-500" />
                  {field('account_name')}
                </div>
                <div className="space-y-1.5">
                  <Label className="text-slate-300">Segmento *</Label>
                  <SearchableSelect
                    value={watch('segment')}
                    onValueChange={(v) => setValue('segment', v as any)}
                    options={[
                      { label: 'SMB', value: 'SMB' },
                      { label: 'Mid-Market', value: 'Mid-Market' },
                      { label: 'Enterprise', value: 'Enterprise' },
                    ]}
                  />
                  {errors.segment && <p className="text-red-500 text-xs">{errors.segment.message}</p>}
                </div>
                <div className="space-y-1.5 md:col-span-1">
                  <Label className="text-slate-300">CSM Responsável (Opcional)</Label>
                  <SearchableSelect
                    placeholder="Atribuir..."
                    emptyMessage="Nenhum CSM encontrado."
                    value={watch('csm_owner_id')}
                    onValueChange={(v) => setValue('csm_owner_id', v === 'none' ? undefined : v)}
                    options={[
                      { label: 'Nenhum', value: 'none' },
                      ...users.map(u => ({ label: u.email, value: u.id }))
                    ]}
                  />
                  {field('csm_owner_id')}
                </div>
              </div>
            </div>

          </CardContent>
        </Card>

        <Card className="bg-slate-900 border-slate-800">
          <CardHeader>
            <CardTitle className="text-white text-base">Contrato Inicial</CardTitle>
            <CardDescription className="text-slate-400">Defina as condições comerciais do LOGO</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-1.5">
                <Label className="text-slate-300">MRR *</Label>
                <MaskedInput 
                  maskType="currency"
                  value={watch('mrr')}
                  onValueChange={(v) => setValue('mrr', parseFloat(v) || 0)}
                  placeholder="R$ 0,00"
                />
                {field('mrr')}
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
            </div>
          </CardContent>
        </Card>

        {error && <p className="text-red-400 text-sm">{error}</p>}

        <div className="flex justify-end gap-3">
          <Link href="/dashboard">
            <Button variant="outline" className="border-red-700 text-red-400 hover:bg-red-950 hover:text-red-300">Cancelar</Button>
          </Link>
          <Button type="submit" disabled={loading} className="bg-indigo-600 hover:bg-indigo-700 text-white gap-2">
            {loading && <Loader2 className="w-4 h-4 animate-spin" />}
            {loading ? 'Salvando...' : 'Criar LOGO'}
          </Button>
        </div>
      </form>
    </div>
  )
}
