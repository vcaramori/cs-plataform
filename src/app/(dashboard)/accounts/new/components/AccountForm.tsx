'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { useForm, useFieldArray } from 'react-hook-form'
import { zodResolver } from '@hookform/resolvers/zod'
import { z } from 'zod'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { PageContainer } from '@/components/layout/PageContainer'
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
  ShieldCheck,
  ShieldOff,
  Shield,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Account, Contract } from '@/lib/supabase/types'

const SLALevelSchema = z.object({
  level: z.enum(['critical', 'high', 'medium', 'low']),
  first_response_minutes: z.number().min(1).default(30),
  resolution_minutes: z.number().min(1).default(240),
  // labels do cliente que mapeiam para este nível (ex: ["Bug Blocker", "P0"])
  client_labels: z.array(z.string()).default([]),
})

const DEFAULT_SLA_LEVELS = [
  { level: 'critical' as const, first_response_minutes: 30,  resolution_minutes: 240,  client_labels: [] },
  { level: 'high'     as const, first_response_minutes: 120, resolution_minutes: 480,  client_labels: [] },
  { level: 'medium'   as const, first_response_minutes: 240, resolution_minutes: 1440, client_labels: [] },
  { level: 'low'      as const, first_response_minutes: 480, resolution_minutes: 2880, client_labels: [] },
]

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
  discount_type: z.enum(['percentage', 'fixed']).default('percentage'),
  discount_value_brl: z.number().min(0).default(0),
  // SLA
  sla_use_global: z.boolean().default(true),
  sla_levels: z.array(SLALevelSchema).default(DEFAULT_SLA_LEVELS),
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

const INPUT = 'bg-accent/30 border-border text-foreground h-10 rounded-xl text-sm focus-visible:ring-primary'
const LABEL = 'text-[10px] font-extrabold text-muted-foreground uppercase tracking-widest'

export function AccountForm({ initialData, mode = 'create' }: AccountFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [searchingCep, setSearchingCep] = useState(false)
  const [users, setUsers] = useState<{ id: string, email: string }[]>([])

  const { register, handleSubmit, setValue, watch, control, formState: { errors } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      ...initialData,
      account_name: initialData.name,
      company_name: initialData.company_name ?? '',
      contracts: initialData.contracts.map(c => ({
        ...c,
        id: c.id,
        discount_type: (c.discount_type ?? 'percentage') as 'percentage' | 'fixed',
        discount_value_brl: c.discount_value_brl ?? 0,
        sla_use_global: true,
        sla_levels: DEFAULT_SLA_LEVELS,
      }))
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
      const saved = await res.json()
      const contractId = contract.id ?? saved.id

      // Salvar SLA do contrato se customizado
      if (!contract.sla_use_global && contractId) {
        const slaRes = await fetch(`/api/contracts/${contractId}/sla`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            use_global_standard: false,
            alert_threshold_pct: 25,
            auto_close_hours: 48,
            timezone: 'America/Sao_Paulo',
            levels: contract.sla_levels ?? DEFAULT_SLA_LEVELS,
          }),
        })
        if (!slaRes.ok) throw new Error('Erro ao salvar SLA do contrato')
      }

      toast.success('Contrato salvo!')
      router.refresh()
    } catch (e: any) {
      toast.error(e.message)
    } finally {
      setLoading(false)
    }
  }

  // Carrega SLA existente ao abrir contrato em edit mode
  async function loadContractSLA(contractId: string, index: number) {
    try {
      const res = await fetch(`/api/contracts/${contractId}/sla`)
      if (!res.ok) return
      const policy = await res.json()
      if (!policy) return
      setValue(`contracts.${index}.sla_use_global`, policy.use_global_standard ?? true)
      if (policy.levels?.length === 4) {
        const mappingsByLevel: Record<string, string[]> = {}
        for (const m of (policy.mappings ?? [])) {
          if (!mappingsByLevel[m.internal_level]) mappingsByLevel[m.internal_level] = []
          mappingsByLevel[m.internal_level].push(m.external_label)
        }
        setValue(`contracts.${index}.sla_levels`, policy.levels.map((l: any) => ({
          level: l.level,
          first_response_minutes: l.first_response_minutes,
          resolution_minutes: l.resolution_minutes,
          client_labels: mappingsByLevel[l.level] ?? [],
        })))
      }
    } catch { /* silently ignore */ }
  }

  return (
    <PageContainer>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-8">
        <div className="flex items-center gap-3">
          <Link href="/dashboard">
            <Button variant="outline" size="icon" className="w-10 h-10 rounded-xl">
              <ArrowLeft className="w-5 h-5" />
            </Button>
          </Link>
          <div className="space-y-0.5">
            <div className="flex items-center gap-2">
              <div className="w-2 h-2 rounded-full bg-primary animate-pulse" />
              <h1 className="text-2xl font-black text-foreground tracking-tighter uppercase whitespace-nowrap">
                {mode === 'create' ? 'Nova Logo' : 'Editar Logo'}
              </h1>
            </div>
            <p className="text-[10px] text-muted-foreground font-bold uppercase tracking-widest">
              Gestão estratégica de clientes plannera
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSubmit(onSubmit)}
            disabled={loading}
            variant="premium"
            className="h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-xs gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            {loading ? 'Salvando...' : 'Efetivar Cadastro'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">

        {/* ── BLOCO 1: IDENTIFICAÇÃO ─────────────────────────────── */}
        <Card variant="glass" className="overflow-hidden border-none shadow-xl">
          <div className="h-[2px] bg-gradient-to-r from-primary/80 to-secondary/80" />
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-foreground text-sm font-black uppercase tracking-widest">Identificação</CardTitle>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Dados principais da conta</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-8">
            {/* Logo upload */}
            <div className="flex justify-center">
              <ImageUpload
                value={watch('logo_url') || ''}
                onChange={(url) => setValue('logo_url', url)}
              />
            </div>

            {/* Razão Social + Nome da Logo */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label className={LABEL}>Razão Social *</Label>
                <Input {...register('company_name')} placeholder="Ex: General Mills Brasil Ltda" className={INPUT} />
                {errors.company_name && <p className="text-destructive text-[10px] font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.company_name.message}</p>}
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>Nome da Logo *</Label>
                <Input {...register('account_name')} placeholder="Ex: Yoki" className={INPUT} />
                {errors.account_name && <p className="text-destructive text-[10px] font-bold flex items-center gap-1 mt-1"><AlertCircle className="w-3 h-3" />{errors.account_name.message}</p>}
              </div>
            </div>

            {/* Demais campos de identificação */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className={LABEL}>Segmento *</Label>
                <SearchableSelect
                  value={watch('segment')}
                  onValueChange={(v) => setValue('segment', v as any)}
                  className="h-10 rounded-xl bg-accent/30 border-border"
                  options={[
                    { label: 'Indústria', value: 'Indústria' },
                    { label: 'MRO', value: 'MRO' },
                    { label: 'Varejo', value: 'Varejo' },
                  ]}
                />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>Setor de Atuação</Label>
                <Input {...register('industry')} placeholder="Ex: Bens de Consumo" className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>Website</Label>
                <Input {...register('website')} placeholder="https://exemplo.com" className={INPUT} />
              </div>
              <div className="space-y-2">
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
        <Card variant="glass" className="overflow-hidden border-none shadow-xl">
          <div className="h-[2px] bg-gradient-to-r from-emerald-500/80 to-teal-500/80" />
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-emerald-500/10 text-emerald-500 shadow-inner">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-foreground text-sm font-black uppercase tracking-widest">Localização</CardTitle>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Endereço e presença física</p>
                </div>
              </div>
              <div className="flex items-center gap-3 bg-accent/30 px-3 py-1.5 rounded-xl border border-border">
                <Label className={cn(LABEL, 'mb-0')}>Inter</Label>
                <Switch
                  checked={isInternational}
                  onCheckedChange={(v) => setValue('is_international', v)}
                  className="data-[state=checked]:bg-emerald-500"
                />
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              {!isInternational && (
                <div className="space-y-2">
                  <Label className={LABEL}>CEP</Label>
                  <div className="relative">
                    <Input {...register('cep')} placeholder="00000-000" className={INPUT} />
                    {searchingCep && <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-3 text-emerald-500" />}
                  </div>
                </div>
              )}
              <div className={cn('space-y-2', isInternational ? 'md:col-span-4' : 'md:col-span-3')}>
                <Label className={LABEL}>Logradouro / Rua</Label>
                <Input {...register('street')} placeholder="Av. Paulista..." className={INPUT} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-[100px_1fr_150px_1fr_100px] gap-6">
              <div className="space-y-2">
                <Label className={LABEL}>Num</Label>
                <Input {...register('number')} placeholder="1000" className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>Complemento</Label>
                <Input {...register('complement')} placeholder="Sala 42..." className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>Bairro</Label>
                <Input {...register('neighborhood')} placeholder="Centro" className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>Cidade</Label>
                <Input {...register('city')} placeholder="São Paulo" className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>UF</Label>
                <Input {...register('state')} placeholder="SP" className={INPUT} />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* ── BLOCO 3: GESTÃO COMERCIAL ──────────────────────────── */}
        <Card variant="glass" className="overflow-hidden border-none shadow-xl">
          <div className="h-[2px] bg-gradient-to-r from-primary/80 to-amber-500/80" />
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                  <FileText className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-foreground text-sm font-black uppercase tracking-widest">Gestão Comercial</CardTitle>
                  <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Contratos e Acordos Atuais</p>
                </div>
              </div>
              <Button
                type="button"
                variant="outline"
                onClick={() => append({
                  mrr: 0,
                  status: 'active',
                  contract_type: 'initial',
                  service_type: 'Professional',
                  pricing_type: 'standard',
                  discount_percentage: 0,
                  discount_duration_months: 0,
                  discount_type: 'percentage',
                  discount_value_brl: 0,
                  sla_use_global: true,
                  sla_levels: DEFAULT_SLA_LEVELS,
                })}
                className="h-10 px-5 rounded-xl text-[10px] font-black uppercase tracking-widest gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              >
                <Plus className="w-4 h-4" /> Add Contrato
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-6">
            {fields.length === 0 && (
              <div className="py-20 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground/30">
                <div className="p-4 rounded-full bg-accent/30">
                  <FileText className="w-10 h-10" />
                </div>
                <p className="text-xs font-black uppercase tracking-widest">Nenhum contrato cadastrado</p>
              </div>
            )}

            {fields.map((field, index) => (
              <Card key={field.id} className="bg-accent/20 border-border rounded-2xl p-6 relative group/card shadow-sm hover:shadow-md transition-all">
                <div className="absolute -top-3 -right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-20">
                  <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="h-8 w-8 rounded-full shadow-lg">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className={LABEL}>Código</Label>
                    <Input {...register(`contracts.${index}.contract_code`)} placeholder="CTR-XXXX" className="h-10 text-xs font-mono bg-accent/30 border-border" />
                  </div>
                  <div className="space-y-2">
                    <Label className={LABEL}>Status</Label>
                    <SearchableSelect
                      value={watch(`contracts.${index}.status`)}
                      onValueChange={(v) => setValue(`contracts.${index}.status`, v as any)}
                      className="h-10 text-xs rounded-xl bg-accent/30 border-border"
                      options={[
                        { label: 'Ativa', value: 'active' },
                        { label: 'Em Negociação', value: 'in-negotiation' },
                        { label: 'Em Risco', value: 'at-risk' },
                        { label: 'Churn', value: 'churned' }
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={LABEL}>Tipo</Label>
                    <SearchableSelect
                      value={watch(`contracts.${index}.contract_type`)}
                      onValueChange={(v) => setValue(`contracts.${index}.contract_type`, v as any)}
                      className="h-10 text-xs rounded-xl bg-accent/30 border-border"
                      options={[
                        { label: 'Inicial', value: 'initial' },
                        { label: 'Aditivo', value: 'additive' },
                        { label: 'Upgrade', value: 'migration' },
                        { label: 'Renovação', value: 'renewal' }
                      ]}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label className={LABEL}>Plano</Label>
                    <SearchableSelect
                      value={watch(`contracts.${index}.service_type`)}
                      onValueChange={(v) => setValue(`contracts.${index}.service_type`, v as any)}
                      className="h-10 text-xs rounded-xl bg-accent/30 border-border"
                      options={[
                        { label: 'Basic', value: 'Basic' },
                        { label: 'Professional', value: 'Professional' },
                        { label: 'Enterprise', value: 'Enterprise' },
                        { label: 'Custom', value: 'Custom' }
                      ]}
                    />
                  </div>

                  {/* Financial Engine */}
                  <div className="col-span-2 space-y-4 p-5 bg-accent/30 rounded-2xl border border-border">
                    <div className="flex items-center justify-between">
                      <Label className="text-[10px] font-black text-foreground uppercase tracking-widest">Financial Engine</Label>
                      <div className="flex items-center gap-1 bg-background/50 rounded-xl p-1 border border-border">
                        {(['standard', 'custom'] as const).map(type => (
                          <button
                            key={type}
                            type="button"
                            onClick={() => setValue(`contracts.${index}.pricing_type`, type)}
                            className={cn(
                              'px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                              watch(`contracts.${index}.pricing_type`) === type
                                ? 'bg-primary text-primary-foreground shadow-sm'
                                : 'text-muted-foreground hover:text-foreground'
                            )}
                          >
                            {type}
                          </button>
                        ))}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className={LABEL}>MRR Base</Label>
                      <MaskedInput
                        maskType="currency"
                        value={watch(`contracts.${index}.mrr`) || 0}
                        onValueChange={(v) => setValue(`contracts.${index}.mrr`, parseFloat(v) || 0)}
                        className="h-11 text-lg font-black bg-background/50 border-border"
                      />
                    </div>
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <Label className={LABEL}>Desconto</Label>
                        <div className="flex items-center gap-1 bg-background/50 rounded-xl p-1 border border-border">
                          {(['percentage', 'fixed'] as const).map(type => (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setValue(`contracts.${index}.discount_type`, type)}
                              className={cn(
                                'px-3 py-1 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all',
                                watch(`contracts.${index}.discount_type`) === type
                                  ? 'bg-primary text-primary-foreground shadow-sm'
                                  : 'text-muted-foreground hover:text-foreground'
                              )}
                            >
                              {type === 'percentage' ? '%' : 'R$'}
                            </button>
                          ))}
                        </div>
                      </div>
                      <div className="grid grid-cols-2 gap-4">
                        <div className="space-y-2">
                          {watch(`contracts.${index}.discount_type`) === 'percentage' ? (
                            <>
                              <Label className={LABEL}>% Desc</Label>
                              <Input {...register(`contracts.${index}.discount_percentage`, { valueAsNumber: true })} type="number" min="0" max="100" className="h-10 bg-background/50" />
                            </>
                          ) : (
                            <>
                              <Label className={LABEL}>Valor R$</Label>
                              <MaskedInput
                                maskType="currency"
                                value={watch(`contracts.${index}.discount_value_brl`) || 0}
                                onValueChange={(v) => setValue(`contracts.${index}.discount_value_brl`, parseFloat(v) || 0)}
                                className="h-10 bg-background/50"
                              />
                            </>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className={LABEL}>Meses</Label>
                          <Input {...register(`contracts.${index}.discount_duration_months`, { valueAsNumber: true })} type="number" className="h-10 bg-background/50" />
                        </div>
                      </div>
                    </div>
                    {watch(`contracts.${index}.pricing_type`) === 'custom' && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <Label className={LABEL}>Justificativa Custom</Label>
                        <Textarea
                          {...register(`contracts.${index}.pricing_explanation`)}
                          placeholder="Justificativa do pricing..."
                          className="min-h-[80px] text-xs bg-background/50 border-border"
                        />
                      </div>
                    )}
                  </div>

                  {/* Datas + Notas */}
                  <div className="col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className={LABEL}>Início</Label>
                        <Input {...register(`contracts.${index}.start_date`)} type="date" className="h-10 text-xs bg-accent/30 border-border" />
                      </div>
                      <div className="space-y-2">
                        <Label className={LABEL}>Renovação</Label>
                        <Input {...register(`contracts.${index}.renewal_date`)} type="date" className="h-10 text-xs bg-accent/30 border-border" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className={LABEL}>Notas Rápidas</Label>
                      <Textarea {...register(`contracts.${index}.notes`)} className="min-h-[80px] text-xs bg-accent/30 border-border" placeholder="Observações do contrato..." />
                    </div>
                    {mode === 'edit' && (
                      <div className="flex justify-end pt-2">
                        <Button
                          type="button"
                          variant="premium"
                          onClick={() => saveContractIndividually(index)}
                          className="h-9 px-6 rounded-xl text-[10px] font-black uppercase tracking-widest"
                        >
                          Salvar Contrato
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* SLA do Contrato */}
                  <div className="col-span-2 md:col-span-4 space-y-6 p-5 bg-accent/30 rounded-2xl border border-border mt-2">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="text-[10px] font-black text-foreground uppercase tracking-widest">SLA do Contrato</Label>
                          <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Prazos de resposta e resolução</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-background/50 rounded-xl p-1 border border-border">
                        <button
                          type="button"
                          onClick={() => setValue(`contracts.${index}.sla_use_global`, true)}
                          className={cn(
                            'px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                            watch(`contracts.${index}.sla_use_global`)
                              ? 'bg-blue-600 text-white shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <ShieldCheck className="w-3.5 h-3.5" /> Padrão Plannera
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setValue(`contracts.${index}.sla_use_global`, false)
                            const cid = watch(`contracts.${index}.id`)
                            if (cid) loadContractSLA(cid, index)
                          }}
                          className={cn(
                            'px-4 py-1.5 rounded-lg text-[9px] font-black uppercase tracking-widest transition-all flex items-center gap-2',
                            !watch(`contracts.${index}.sla_use_global`)
                              ? 'bg-primary text-primary-foreground shadow-sm'
                              : 'text-muted-foreground hover:text-foreground'
                          )}
                        >
                          <ShieldOff className="w-3.5 h-3.5" /> Customizado
                        </button>
                      </div>
                    </div>

                    {watch(`contracts.${index}.sla_use_global`) ? (
                      <div className="flex items-center gap-3 p-4 rounded-xl bg-blue-500/5 border border-blue-500/10">
                        <AlertCircle className="w-4 h-4 text-blue-500" />
                        <p className="text-[10px] text-blue-500/80 font-bold uppercase tracking-wider">
                          Herdando diretrizes da Política Global Plannera.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-[140px_1fr_100px_100px] gap-4 items-center px-2">
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Nível</span>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest">Labels do Cliente</span>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">1ª Resp</span>
                          <span className="text-[9px] font-black text-muted-foreground uppercase tracking-widest text-center">Resolução</span>
                        </div>

                        {(watch(`contracts.${index}.sla_levels`) ?? DEFAULT_SLA_LEVELS).map((lvl, li) => {
                          const levelMeta = {
                            critical: { label: 'Crítico', color: 'text-red-500 border-red-500/20 bg-red-500/10' },
                            high:     { label: 'Alto',    color: 'text-orange-500 border-orange-500/20 bg-orange-500/10' },
                            medium:   { label: 'Médio',   color: 'text-amber-500 border-amber-500/20 bg-amber-500/10' },
                            low:      { label: 'Baixo',   color: 'text-emerald-500 border-emerald-500/20 bg-emerald-500/10' },
                          }[lvl.level]

                          return (
                            <Card key={lvl.level} className="grid grid-cols-[140px_1fr_100px_100px] gap-4 items-start p-4 rounded-xl bg-background/40 border-border group/sla">
                              <div className="pt-1.5">
                                <span className={cn('text-[10px] font-black uppercase tracking-widest px-3 py-1.5 rounded-xl border block text-center', levelMeta?.color)}>
                                  {levelMeta?.label}
                                </span>
                              </div>

                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {(lvl.client_labels ?? []).map((label, labelIdx) => (
                                    <span
                                      key={labelIdx}
                                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-accent text-[9px] font-black text-foreground uppercase border border-border"
                                    >
                                      {label}
                                      <button
                                        type="button"
                                        className="text-muted-foreground hover:text-destructive transition-colors"
                                        onClick={() => {
                                          const levels = [...(watch(`contracts.${index}.sla_levels`) ?? DEFAULT_SLA_LEVELS)]
                                          levels[li] = { ...levels[li], client_labels: levels[li].client_labels.filter((_, i) => i !== labelIdx) }
                                          setValue(`contracts.${index}.sla_levels`, levels)
                                        }}
                                      >×</button>
                                    </span>
                                  ))}
                                </div>
                                <Input
                                  placeholder="Add label (P0, Urgente...)"
                                  className="h-9 text-xs bg-accent/30 border-border placeholder:text-muted-foreground/50 rounded-lg"
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter' || e.key === ',') {
                                      e.preventDefault()
                                      const val = e.currentTarget.value.trim().replace(/,$/, '')
                                      if (!val) return
                                      const levels = [...(watch(`contracts.${index}.sla_levels`) ?? DEFAULT_SLA_LEVELS)]
                                      if (!levels[li].client_labels.includes(val)) {
                                        levels[li] = { ...levels[li], client_labels: [...levels[li].client_labels, val] }
                                        setValue(`contracts.${index}.sla_levels`, levels)
                                      }
                                      e.currentTarget.value = ''
                                    }
                                  }}
                                />
                              </div>

                              <div className="flex flex-col items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={lvl.first_response_minutes}
                                  onChange={(e) => {
                                    const levels = [...(watch(`contracts.${index}.sla_levels`) ?? DEFAULT_SLA_LEVELS)]
                                    levels[li] = { ...levels[li], first_response_minutes: parseInt(e.target.value) || 1 }
                                    setValue(`contracts.${index}.sla_levels`, levels)
                                  }}
                                  className="h-10 text-xs text-center bg-accent/30 border-border font-mono rounded-lg"
                                />
                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Min</span>
                              </div>

                              <div className="flex flex-col items-center gap-1">
                                <Input
                                  type="number"
                                  min="1"
                                  value={lvl.resolution_minutes}
                                  onChange={(e) => {
                                    const levels = [...(watch(`contracts.${index}.sla_levels`) ?? DEFAULT_SLA_LEVELS)]
                                    levels[li] = { ...levels[li], resolution_minutes: parseInt(e.target.value) || 1 }
                                    setValue(`contracts.${index}.sla_levels`, levels)
                                  }}
                                  className="h-10 text-xs text-center bg-accent/30 border-border font-mono rounded-lg"
                                />
                                <span className="text-[8px] text-muted-foreground font-black uppercase tracking-tighter">Min</span>
                              </div>
                            </Card>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </Card>
            ))}
          </CardContent>
        </Card>

        {/* ── BLOCO 4: FATURAMENTO E TIME ────────────────────────── */}
        <Card variant="glass" className="overflow-hidden border-none shadow-xl">
          <div className="h-[2px] bg-gradient-to-r from-blue-500/80 to-indigo-500/80" />
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-blue-500/10 text-blue-500 shadow-inner">
                <CreditCard className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-foreground text-sm font-black uppercase tracking-widest">Faturamento e Time</CardTitle>
                <p className="text-[9px] text-muted-foreground font-bold uppercase tracking-tight">Configurações administrativas</p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-8">
            <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
              <div className="space-y-2">
                <Label className={LABEL}>Vencimento</Label>
                <Input {...register('billing_day', { valueAsNumber: true })} type="number" min="1" max="31" className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>Responsável Fin</Label>
                <Input {...register('billing_contact_name')} placeholder="Nome do Responsável" className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>E-mail Fin</Label>
                <Input {...register('billing_contact_email')} placeholder="financeiro@empresa.com" className={INPUT} />
              </div>
              <div className="space-y-2">
                <Label className={LABEL}>Telefone Fin</Label>
                <Input {...register('billing_contact_phone')} placeholder="(00) 00000-0000" className={INPUT} />
              </div>
            </div>
            <div className="space-y-2">
              <Label className={LABEL}>Regras de Faturamento</Label>
              <Textarea {...register('billing_rules')} className="min-h-[100px] bg-accent/30 border-border text-sm rounded-xl" placeholder="Descreva acordos específicos e particularidades de faturamento..." />
            </div>

            <div className="h-px bg-border/50" />

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-black text-foreground uppercase tracking-widest">Time Interno de Atendimento</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className={LABEL}>CSM Responsável</Label>
                  <SearchableSelect
                    placeholder="Selecionar CSM..."
                    value={watch('csm_owner_id') || ''}
                    onValueChange={(v) => setValue('csm_owner_id', v === 'none' ? null : v)}
                    className="h-11 rounded-xl bg-accent/30 border-border"
                    options={[
                      { label: 'Não Atribuído', value: 'none' },
                      ...users.map(u => ({ label: u.email, value: u.id }))
                    ]}
                  />
                </div>
                <div className="space-y-2">
                  <Label className={LABEL}>Executivo Comercial</Label>
                  <SearchableSelect
                    placeholder="Selecionar Executivo..."
                    value={watch('sales_executive_id') || ''}
                    onValueChange={(v) => setValue('sales_executive_id', v === 'none' ? null : v)}
                    className="h-11 rounded-xl bg-accent/30 border-border"
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
    </PageContainer>
  )
}

export default AccountForm;
