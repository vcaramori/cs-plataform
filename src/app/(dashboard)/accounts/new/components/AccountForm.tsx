'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchableSelect } from '@/components/ui/searchable-select'
import { ImageUpload } from '@/components/ui/image-upload'
import { MaskedInput } from '@/components/ui/masked-input'
import { Switch } from '@/components/ui/switch'
import { Textarea } from '@/components/ui/textarea'
import {
  ArrowLeft,
  Loader2,
  BadgeCheck,
  CreditCard,
  Briefcase,
  Globe,
  MapPin,
  Mail,
  Phone,
  Calendar,
  Zap,
  Plus,
  Trash2,
  AlertCircle,
  FileText,
  Target,
  Users,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Account, Contract } from '@/lib/supabase/types'

const ContractSchema = z.object({
  id: z.string().optional(),
  contract_code: z.string().optional().nullable(),
  mrr: z.number().nonnegative(),
  start_date: z.string().optional().nullable(),
  renewal_date: z.string().optional().nullable(),
  contract_type: z.enum(['initial', 'additive', 'migration', 'renewal']).default('initial'),
  service_type: z.enum(['Basic', 'Professional', 'Enterprise', 'Custom']).default('Professional'),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).default('active'),
  pricing_type: z.enum(['standard', 'custom']).default('standard'),
  pricing_explanation: z.string().optional().nullable(),
  discount_percentage: z.number().min(0).max(100).default(0),
  discount_duration_months: z.number().int().min(0).default(0),
  notes: z.string().optional().nullable(),
})

const schema = z.object({
  company_name: z.string().min(2, 'Razão social obrigatória'),
  account_name: z.string().min(2, 'Nome da logo obrigatório'),
  segment: z.enum(['Indústria', 'MRO', 'Varejo']),
  industry: z.string().optional().nullable(),
  website: z.string().url('URL inválida').optional().or(z.literal('')).nullable(),
  logo_url: z.string().optional().nullable(),
  tax_id: z.string().optional().or(z.literal('')).nullable(),

  cep: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  is_international: z.boolean().default(false),

  csm_owner_id: z.string().uuid('Selecione um CSM').optional().nullable(),
  sales_executive_id: z.string().uuid('Selecione um Executivo').optional().nullable(),

  billing_day: z.number().min(0).max(31).optional().nullable(),
  billing_rules: z.string().optional().nullable(),
  billing_contact_name: z.string().optional().nullable(),
  billing_contact_phone: z.string().optional().nullable(),
  billing_contact_email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),

  contracts: z.array(ContractSchema),
})

type FormData = z.infer<typeof schema>

interface AccountFormProps {
  initialData?: Account & { contracts: Contract[] }
  mode?: 'create' | 'edit'
}

const INPUT = 'bg-white/[0.03] border-white/8 text-white h-10 rounded-xl text-sm'
const LABEL = 'text-[10px] font-bold text-slate-500 uppercase tracking-widest'

export function AccountForm({ initialData, mode = 'create' }: AccountFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchingCep, setSearchingCep] = useState(false)
  const [users, setUsers] = useState<{ id: string, email: string }[]>([])

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    resolver: zodResolver(schema),
    defaultValues: initialData ? {
      ...initialData,
      account_name: initialData.name,
      contracts: initialData.contracts.map(c => ({ ...c, id: c.id }))
    } : {
      segment: 'Indústria',
      contracts: [],
      is_international: false,
      billing_day: 0
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'contracts' })
  const isInternational = watch('is_international')
  const cepValue = watch('cep')

  useEffect(() => {
    fetch('/api/users').then(r => r.json()).then(setUsers).catch(console.error)
  }, [])

  useEffect(() => {
    const clean = cepValue?.replace(/\D/g, '')
    if (clean?.length === 8 && !isInternational) handleCepSearch(clean)
  }, [cepValue, isInternational])

  async function handleCepSearch(cep: string) {
    setSearchingCep(true)
    try {
      const res = await fetch(`https://viacep.com.br/ws/${cep}/json/`)
      const data = await res.json()
      if (!data.erro) {
        setValue('street', data.logradouro)
        setValue('neighborhood', data.bairro)
        setValue('city', data.localidade)
        setValue('state', data.uf)
        toast.success('Endereço localizado!')
      }
    } catch { console.error('Erro ao buscar CEP') }
    finally { setSearchingCep(false) }
  }

  async function onSubmit(data: FormData) {
    setLoading(true)
    try {
      const url = mode === 'create' ? '/api/accounts' : `/api/accounts/${initialData?.id}`
      const res = await fetch(url, {
        method: mode === 'create' ? 'POST' : 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      })
      if (!res.ok) {
        const err = await res.json()
        throw new Error(err.error || 'Erro ao salvar LOGO')
      }
      const account = await res.json()
      toast.success(mode === 'create' ? 'LOGO criado com sucesso!' : 'LOGO atualizado com sucesso!')
      router.push(`/accounts/${account.id || initialData?.id}`)
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  async function saveContractIndividually(index: number) {
    const contract = watch(`contracts.${index}`)
    if (!initialData?.id) {
      toast.error('Salve a logo primeiro antes de gerenciar contratos individualmente.')
      return
    }
    setLoading(true)
    try {
      const method = contract.id ? 'PATCH' : 'POST'
      const url = contract.id ? `/api/contracts/${contract.id}` : '/api/contracts'
      const res = await fetch(url, {
        method,
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...contract, account_id: initialData.id }),
      })
      if (!res.ok) throw new Error('Erro ao salvar contrato')
      toast.success('Contrato salvo!')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="w-full min-h-screen bg-[#020617] font-sans pb-24">

      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="w-full px-4 pt-6 pb-8 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="ghost" size="sm" className="h-9 px-3 rounded-xl bg-white/5 border border-white/5 text-slate-400 hover:text-white hover:bg-white/10 transition-all">
              <ArrowLeft className="w-4 h-4 mr-1.5" /> Voltar
            </Button>
          </Link>
          <Target className="w-5 h-5 text-plannera-orange shrink-0" />
          <h1 className="text-2xl font-bold text-white tracking-tight">
            {mode === 'create' ? 'Nova Logo' : 'Editar Logo'}
          </h1>
        </div>
        <Button
          onClick={handleSubmit(onSubmit)}
          disabled={loading}
          className="h-10 px-6 rounded-xl font-bold uppercase tracking-widest text-xs gap-2 bg-gradient-to-r from-plannera-orange to-[#f59e0b] text-white border-none shadow-md hover:shadow-lg transition-all active:scale-95"
        >
          {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
          {loading ? 'Salvando...' : 'Efetivar Cadastro'}
        </Button>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="w-full px-4 space-y-8">

        {/* ── BLOCO 1: IDENTIFICAÇÃO ─────────────────────────────── */}
        <Card className="bg-slate-900/40 border-white/5 rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-indigo-500 to-plannera-sop" />
          <CardHeader className="px-8 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-indigo-500/10 text-indigo-400">
                <Briefcase className="w-4 h-4" />
              </div>
              <CardTitle className="text-white text-base font-bold uppercase tracking-wide">Identificação</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-6">
            {/* Logo upload */}
            <div className="flex justify-center">
              <ImageUpload
                value={watch('logo_url') || ''}
                onChange={(url) => setValue('logo_url', url)}
              />
            </div>

            {/* Razão Social + Nome da Logo — destaque no topo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={LABEL}>Razão Social *</Label>
                <Input {...register('company_name')} placeholder="Ex: General Mills Brasil Ltda" className={INPUT} />
                {errors.company_name && <p className="text-red-500 text-[10px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.company_name.message}</p>}
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Nome da Logo *</Label>
                <Input {...register('account_name')} placeholder="Ex: Yoki" className={INPUT} />
                {errors.account_name && <p className="text-red-500 text-[10px] font-bold flex items-center gap-1"><AlertCircle className="w-3 h-3" />{errors.account_name.message}</p>}
              </div>
            </div>

            {/* Demais campos de identificação */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={LABEL}>Segmento *</Label>
                <SearchableSelect
                  value={watch('segment')}
                  onValueChange={(v) => setValue('segment', v as any)}
                  className="h-10"
                  options={[
                    { label: 'Indústria', value: 'Indústria' },
                    { label: 'MRO', value: 'MRO' },
                    { label: 'Varejo', value: 'Varejo' },
                  ]}
                />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Setor de Atuação</Label>
                <Input {...register('industry')} placeholder="Ex: Bens de Consumo" className={INPUT} />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Website</Label>
                <Input {...register('website')} placeholder="https://exemplo.com" className={INPUT} />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>CNPJ / Tax ID</Label>
                <MaskedInput
                  maskType="tax_id"
                  value={watch('tax_id') || ''}
                  onValueChange={(v) => setValue('tax_id', v)}
                  placeholder="00.000.000/0000-00"
                  className="h-10"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── BLOCO 2: LOCALIZAÇÃO ───────────────────────────────── */}
        <Card className="bg-slate-900/40 border-white/5 rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-emerald-500/50" />
          <CardHeader className="px-8 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400">
                  <MapPin className="w-4 h-4" />
                </div>
                <CardTitle className="text-white text-base font-bold uppercase tracking-wide">Localização</CardTitle>
              </div>
              <div className="flex items-center gap-2 bg-white/5 px-3 py-1.5 rounded-lg border border-white/5">
                <Label className={cn(LABEL, 'mb-0')}>Internacional</Label>
                <Switch
                  checked={isInternational}
                  onCheckedChange={(v) => setValue('is_international', v)}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-4">
            {/* Linha 1: CEP + Logradouro */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              {!isInternational && (
                <div className="space-y-1.5">
                  <Label className={LABEL}>CEP</Label>
                  <div className="relative">
                    <Input {...register('cep')} placeholder="00000-000" className={INPUT} />
                    {searchingCep && <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-3 text-emerald-500" />}
                  </div>
                </div>
              )}
              <div className={cn('space-y-1.5', isInternational ? 'md:col-span-4' : 'md:col-span-3')}>
                <Label className={LABEL}>Logradouro / Rua</Label>
                <Input {...register('street')} placeholder="Av. Paulista..." className={INPUT} />
              </div>
            </div>

            {/* Linha 2: Número + Complemento + Bairro + Cidade + UF */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label className={LABEL}>Número</Label>
                <Input {...register('number')} placeholder="1000" className={INPUT} />
              </div>
              <div className="space-y-1.5 md:col-span-2">
                <Label className={LABEL}>Complemento</Label>
                <Input {...register('complement')} placeholder="Sala 42, Bloco B..." className={INPUT} />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Bairro</Label>
                <Input {...register('neighborhood')} placeholder="Centro" className={INPUT} />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Cidade</Label>
                <Input {...register('city')} placeholder="São Paulo" className={INPUT} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="space-y-1.5">
                <Label className={LABEL}>Estado / UF</Label>
                <Input {...register('state')} placeholder="SP" className={INPUT} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── BLOCO 3: GESTÃO COMERCIAL ──────────────────────────── */}
        <Card className="bg-slate-900/40 border-white/5 rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-gradient-to-r from-plannera-orange to-[#f59e0b]" />
          <CardHeader className="px-8 pt-6 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-xl bg-plannera-orange/10 text-plannera-orange">
                  <FileText className="w-4 h-4" />
                </div>
                <CardTitle className="text-white text-base font-bold uppercase tracking-wide">Gestão Comercial</CardTitle>
              </div>
              <Button
                type="button"
                onClick={() => append({
                  mrr: 0,
                  status: 'active',
                  contract_type: 'initial',
                  service_type: 'Professional',
                  pricing_type: 'standard',
                  discount_percentage: 0,
                  discount_duration_months: 0,
                })}
                className="h-9 px-4 rounded-xl bg-white/5 hover:bg-white/10 border border-white/10 text-xs font-bold uppercase tracking-widest gap-1.5"
              >
                <Plus className="w-3.5 h-3.5" /> Add Contrato
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-4">
            {fields.length === 0 && (
              <div className="py-10 border-2 border-dashed border-white/5 rounded-xl flex flex-col items-center justify-center gap-2 text-slate-600">
                <FileText className="w-8 h-8" />
                <p className="text-[10px] font-bold uppercase tracking-widest">Nenhum contrato cadastrado</p>
              </div>
            )}

            {fields.map((field, index) => (
              <Card key={field.id} className="bg-black/20 border-white/5 rounded-xl p-5 relative group/card">
                <div className="absolute -top-2.5 -right-2.5 opacity-0 group-hover/card:opacity-100 transition-opacity">
                  <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="h-7 w-7 rounded-full shadow-lg">
                    <Trash2 className="w-3.5 h-3.5" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Código</Label>
                    <Input {...register(`contracts.${index}.contract_code`)} placeholder="CTR-XXXX" className="h-10 text-xs font-mono bg-white/5 border-none" />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Status</Label>
                    <SearchableSelect
                      value={watch(`contracts.${index}.status`)}
                      onValueChange={(v) => setValue(`contracts.${index}.status`, v as any)}
                      className="h-10 text-xs"
                      options={[
                        { label: 'Ativo', value: 'active' },
                        { label: 'Em Negociação', value: 'in-negotiation' },
                        { label: 'Em Risco', value: 'at-risk' },
                        { label: 'Churn', value: 'churned' }
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Tipo</Label>
                    <SearchableSelect
                      value={watch(`contracts.${index}.contract_type`)}
                      onValueChange={(v) => setValue(`contracts.${index}.contract_type`, v as any)}
                      className="h-10 text-xs"
                      options={[
                        { label: 'Inicial', value: 'initial' },
                        { label: 'Aditivo', value: 'additive' },
                        { label: 'Upgrade', value: 'migration' },
                        { label: 'Renovação', value: 'renewal' }
                      ]}
                    />
                  </div>
                  <div className="space-y-1.5">
                    <Label className="text-[9px] font-bold text-slate-500 uppercase">Plano</Label>
                    <SearchableSelect
                      value={watch(`contracts.${index}.service_type`)}
                      onValueChange={(v) => setValue(`contracts.${index}.service_type`, v as any)}
                      className="h-10 text-xs"
                      options={[
                        { label: 'Basic', value: 'Basic' },
                        { label: 'Professional', value: 'Professional' },
                        { label: 'Enterprise', value: 'Enterprise' },
                        { label: 'Custom', value: 'Custom' }
                      ]}
                    />
                  </div>

                  {/* Financial Engine */}
                  <div className="col-span-2 space-y-3 p-4 bg-black/40 rounded-xl border border-white/5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-bold text-slate-400 uppercase">Financial Engine</Label>
                      {/* Standard / Custom toggle */}
                      <div className="flex items-center gap-1 bg-white/5 rounded-lg p-0.5 border border-white/8">
                        {(['standard', 'custom'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setValue(`contracts.${index}.pricing_type`, type)}
                            className={cn(
                              'px-2.5 py-1 rounded-md text-[9px] font-bold uppercase tracking-widest transition-all',
                              watch(`contracts.${index}.pricing_type`) === type
                                ? 'bg-plannera-orange text-white shadow'
                                : 'text-slate-500 hover:text-white'
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">MRR Base</Label>
                      <MaskedInput
                        maskType="currency"
                        value={watch(`contracts.${index}.mrr`) || 0}
                        onValueChange={(v) => setValue(`contracts.${index}.mrr`, parseFloat(v) || 0)}
                        className="h-10 text-base font-bold"
                      />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">% Cupom</Label>
                        <Input {...register(`contracts.${index}.discount_percentage`, { valueAsNumber: true })} type="number" className="h-9" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Meses</Label>
                        <Input {...register(`contracts.${index}.discount_duration_months`, { valueAsNumber: true })} type="number" className="h-9" />
                      </div>
                    </div>
                    {watch(`contracts.${index}.pricing_type`) === 'custom' && (
                      <div className="space-y-1.5 pt-1 border-t border-white/5">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Justificativa do Preço Custom</Label>
                        <Textarea
                          {...register(`contracts.${index}.pricing_explanation`)}
                          placeholder="Descreva a composição e justificativa do pricing customizado..."
                          className="min-h-[72px] text-xs bg-white/5 border-white/8"
                        />
                      </div>
                    )}
                  </div>

                  {/* Datas + Notas */}
                  <div className="col-span-2 space-y-3">
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Início</Label>
                        <Input {...register(`contracts.${index}.start_date`)} type="date" className="h-10 text-xs" />
                      </div>
                      <div className="space-y-1.5">
                        <Label className="text-[9px] font-bold text-slate-500 uppercase">Renovação</Label>
                        <Input {...register(`contracts.${index}.renewal_date`)} type="date" className="h-10 text-xs" />
                      </div>
                    </div>
                    <div className="space-y-1.5">
                      <Label className="text-[9px] font-bold text-slate-500 uppercase">Notas Rápidas</Label>
                      <Textarea {...register(`contracts.${index}.notes`)} className="min-h-[60px] text-xs bg-white/5 border-none" placeholder="Observações do contrato..." />
                    </div>
                    {mode === 'edit' && (
                      <div className="flex justify-end pt-1">
                        <Button
                          type="button"
                          variant="outline"
                          onClick={() => saveContractIndividually(index)}
                          className="h-8 px-4 rounded-lg text-[9px] font-bold uppercase tracking-widest border-emerald-500/30 text-emerald-400 hover:bg-emerald-500/10"
                        >
                          Salvar Unidade
                        </Button>
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* ── BLOCO 4: FATURAMENTO E TIME ────────────────────────── */}
        <Card className="bg-slate-900/40 border-white/5 rounded-2xl overflow-hidden">
          <div className="h-[3px] bg-sky-500/50" />
          <CardHeader className="px-8 pt-6 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2 rounded-xl bg-sky-500/10 text-sky-400">
                <CreditCard className="w-4 h-4" />
              </div>
              <CardTitle className="text-white text-base font-bold uppercase tracking-wide">Faturamento e Time</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-8 space-y-6">

            {/* Faturamento */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="space-y-1.5">
                <Label className={LABEL}>Dia de Vencimento</Label>
                <Input {...register('billing_day', { valueAsNumber: true })} type="number" min="1" max="31" className={INPUT} />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Contato de Faturamento</Label>
                <Input {...register('billing_contact_name')} placeholder="Nome do Responsável" className={INPUT} />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>E-mail de Faturamento</Label>
                <Input {...register('billing_contact_email')} placeholder="financeiro@empresa.com" className={INPUT} />
              </div>
              <div className="space-y-1.5">
                <Label className={LABEL}>Telefone de Faturamento</Label>
                <Input {...register('billing_contact_phone')} placeholder="(00) 00000-0000" className={INPUT} />
              </div>
              <div className="md:col-span-2 space-y-1.5">
                <Label className={LABEL}>Regras de Faturamento</Label>
                <Textarea {...register('billing_rules')} className="min-h-[80px] bg-white/[0.03] border-white/8 text-sm" placeholder="Descreva acordos específicos..." />
              </div>
            </div>

            {/* Divider */}
            <div className="h-px bg-white/5" />

            {/* Time Interno */}
            <div>
              <div className="flex items-center gap-2 mb-4">
                <Users className="w-4 h-4 text-indigo-400" />
                <span className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Time Interno</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <Label className={LABEL}>CSM Responsável</Label>
                  <SearchableSelect
                    placeholder="Selecionar CSM..."
                    value={watch('csm_owner_id') || ''}
                    onValueChange={(v) => setValue('csm_owner_id', v === 'none' ? null : v)}
                    className="h-10"
                    options={[
                      { label: 'Não Atribuído', value: 'none' },
                      ...users.map(u => ({ label: u.email, value: u.id }))
                    ]}
                  />
                </div>
                <div className="space-y-1.5">
                  <Label className={LABEL}>Executivo Comercial</Label>
                  <SearchableSelect
                    placeholder="Selecionar Executivo..."
                    value={watch('sales_executive_id') || ''}
                    onValueChange={(v) => setValue('sales_executive_id', v === 'none' ? null : v)}
                    className="h-10"
                    options={[
                      { label: 'Não Atribuído', value: 'none' },
                      ...users.map(u => ({ label: u.email, value: u.id }))
                    ]}
                  />
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

      </form>
    </div>
  )
}
