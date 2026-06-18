'use client'

import { useState, useEffect, useRef } from 'react'
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
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { toast } from 'sonner'
import { cn } from '@/lib/utils'
import type { Account, Contract, CommercialGovernance } from '@/lib/supabase/types'
import { getSupabaseBrowserClient } from '@/lib/supabase/client'
import { CommercialGovernanceForm } from './CommercialGovernanceForm'

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
  service_type: z.string().default('Professional'),
  status: z.enum(['active', 'at-risk', 'churned', 'in-negotiation']).default('active'),
  pricing_type: z.enum(['standard', 'custom']).default('standard'),
  pricing_explanation: z.string().optional().nullable(),
  contracted_hours_monthly: z.number().min(0).default(0),
  sla_use_global: z.boolean().default(true),
  sla_levels: z.array(SLALevelSchema).default(DEFAULT_SLA_LEVELS),
  notes: z.string().optional().nullable(),
  instance_url: z.string().optional().nullable(),
})

const GovernanceSchema = z.object({
  id: z.string().optional(),
  rule_type: z.enum(['discount', 'penalty', 'fidelity']),
  sub_type: z.enum(['progressive', 'fixed', 'percentage', 'fidelity_penalty']),
  label: z.string(),
  value: z.number().default(0),
  contract_id: z.string().uuid().optional().nullable(),
  starts_at: z.string().optional().nullable(),
  ends_at: z.string().optional().nullable(),
  config: z.any().default({}),
  is_active: z.boolean().default(true),
})

const schema = z.object({
  company_name: z.string().min(2, 'Razão social obrigatória'),
  account_name: z.string().min(2, 'Nome da logo obrigatório'),
  segment: z.enum(['Indústria', 'MRO', 'Varejo', 'Distribuidor']),
  industry: z.string().optional().nullable(),
  website: z.string().url('URL inválida').optional().or(z.literal('')).nullable(),
  logo_url: z.string().optional().nullable(),
  tax_id: z.string().optional().or(z.literal('')).nullable(),
  helpdesk_tags: z.string().optional().or(z.literal('')).nullable(),

  cep: z.string().optional().nullable(),
  street: z.string().optional().nullable(),
  number: z.string().optional().nullable(),
  complement: z.string().optional().nullable(),
  neighborhood: z.string().optional().nullable(),
  city: z.string().optional().nullable(),
  state: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  is_international: z.boolean().default(false),

  csm_owner_id: z.string().uuid('Selecione um CSM').optional().nullable(),
  sales_executive_id: z.string().uuid('Selecione um Executivo').optional().nullable(),

  billing_day: z.number().min(0).max(31).optional().nullable(),
  billing_rules: z.string().optional().nullable(),
  billing_contact_name: z.string().optional().nullable(),
  billing_contact_phone: z.string().optional().nullable(),
  billing_contact_email: z.string().email('Email inválido').optional().or(z.literal('')).nullable(),

  contracts: z.array(ContractSchema),
  commercial_governance: z.array(GovernanceSchema).default([]),
})

type FormData = z.infer<typeof schema>

interface AccountFormProps {
  initialData?: Account & { contracts: Contract[], commercial_governance: CommercialGovernance[] }
  mode?: 'create' | 'edit'
}

const INPUT = 'bg-background/50 border-border/60 text-content-primary h-11 rounded-2xl text-sm font-medium focus-visible:ring-primary/30 transition-all placeholder:text-content-secondary/50 shadow-sm'
const LABEL = 'label-premium'

export function AccountForm({ initialData, mode = 'create' }: AccountFormProps) {
  const router = useRouter()
  const isEdit = mode === 'edit'
  const [loading, setLoading] = useState(false)
  const [searchingCep, setSearchingCep] = useState(false)
  const [users, setUsers] = useState<{ id: string, email: string }[]>([])
  const [plans, setPlans] = useState<{ id: string, name: string }[]>([])
  const isCepUserEdited = useRef(false)

  const { register, handleSubmit, setValue, watch, control, formState: { errors, dirtyFields } } = useForm<FormData>({
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    resolver: zodResolver(schema) as any,
    defaultValues: initialData ? {
      ...initialData,
      account_name: initialData.name,
      company_name: initialData.company_name ?? '',
      contracts: initialData.contracts.map(c => ({
        ...c,
        id: c.id,
        sla_use_global: true,
        sla_levels: DEFAULT_SLA_LEVELS,
      })),
      commercial_governance: initialData.commercial_governance ?? []
    } : {
      segment: 'Indústria',
      contracts: [],
      commercial_governance: [],
      is_international: false,
      billing_day: 0
    },
  })

  const { fields, append, remove } = useFieldArray({ control, name: 'contracts' })
  const isInternational = watch('is_international')
  const cepValue = watch('cep')

  useEffect(() => {
    // Garante arrays: rotas podem retornar { error } (ex.: CSM sem permissão em
    // /api/users), o que quebraria os .map() abaixo e derrubaria a página.
    // Fallback: quem pode criar conta mas não pode listar usuários (ex.: CSM com
    // permissão em "Gestão de Contas") ainda consegue se atribuir como responsável.
    fetch('/api/users')
      .then(r => r.json())
      .then(async data => {
        if (Array.isArray(data) && data.length > 0) {
          // Apenas usuários internos podem ser CSM/Vendedor (exclui externos do portal)
          setUsers(data.filter((u: any) => u.user_type !== 'external'))
          return
        }
        const { data: { user } } = await getSupabaseBrowserClient().auth.getUser()
        if (user) {
          setUsers([{ id: user.id, email: user.email ?? 'Você' }])
          if (!isEdit && !watch('csm_owner_id')) setValue('csm_owner_id', user.id)
        } else {
          setUsers([])
        }
      })
      .catch(console.error)
    fetch('/api/product/plans')
      .then(r => r.json())
      .then(data => setPlans(Array.isArray(data) ? data : []))
      .catch(console.error)
  }, [])

  useEffect(() => {
    const clean = cepValue?.replace(/\D/g, '')
    if (clean?.length === 8 && !isInternational && isCepUserEdited.current) {
      handleCepSearch(clean)
    }
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
      const saved = await res.json().catch(() => ({}))
      if (!res.ok) {
        // Surface o motivo real da API (validação Zod ou erro do banco) em vez de genérico.
        const detail = typeof saved?.error === 'string' ? saved.error : saved?.error ? JSON.stringify(saved.error) : ''
        throw new Error(detail ? `Erro ao salvar contrato: ${detail}` : 'Erro ao salvar contrato')
      }
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
        if (!slaRes.ok) {
          const sErr = await slaRes.json().catch(() => ({}))
          const d = typeof sErr?.error === 'string' ? sErr.error : ''
          throw new Error(d ? `Erro ao salvar SLA do contrato: ${d}` : 'Erro ao salvar SLA do contrato')
        }
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
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-6 mb-10">
        <div className="flex items-center gap-4">
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => router.back()}
            className="rounded-full hover:bg-primary/10 text-primary transition-all duration-300"
          >
            <ArrowLeft className="w-5 h-5" />
          </Button>
          <div className="space-y-1">
            <h1 className="h1-page">
              {isEdit ? 'Editar Logo' : 'Nova Logo'}
            </h1>
            <p className="label-premium opacity-60">
              {isEdit ? 'Atualize as informações cadastrais e comerciais' : 'Cadastre uma nova conta no ecossistema'}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <Button
            onClick={handleSubmit(onSubmit, (errors) => toast.error('Erros de validação: ' + Object.keys(errors).join(', ') + (errors.contracts ? ' em contracts' : '')))}
            disabled={loading}
            variant="premium"
            className="h-11 px-8 rounded-xl font-bold uppercase tracking-widest text-xs gap-2"
          >
            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <BadgeCheck className="w-4 h-4" />}
            {loading ? 'Salvando...' : 'Efetivar Cadastro'}
          </Button>
        </div>
      </div>

      <form onSubmit={handleSubmit(onSubmit, (errors) => toast.error('Erros de validação: ' + Object.keys(errors).join(', ') + (errors.contracts ? ' em contracts' : '')))} className="space-y-8">

        {/* ── BLOCO 1: IDENTIFICAÇÃO ─────────────────────────────── */}
        <Card variant="glass" className="overflow-hidden border-none shadow-xl">
          <div className="h-[2px] bg-gradient-to-r from-primary/80 to-secondary/80" />
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex items-center gap-3">
              <div className="p-2.5 rounded-xl bg-primary/10 text-primary shadow-inner">
                <Briefcase className="w-5 h-5" />
              </div>
              <div className="space-y-0.5">
                <CardTitle className="text-foreground text-sm font-extrabold uppercase tracking-widest">Identificação</CardTitle>
                <p className="text-[10px] text-content-secondary font-medium tracking-wide">Dados principais da conta</p>
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
                  className={INPUT}
                  options={[
                    { label: 'Indústria', value: 'Indústria' },
                    { label: 'MRO', value: 'MRO' },
                    { label: 'Varejo', value: 'Varejo' },
                    { label: 'Distribuidor', value: 'Distribuidor' },
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
                  className={INPUT}
                />
              </div>
            </div>

            {/* Tags HelpDesk — resolução automática de chamados → conta */}
            <div className="space-y-2">
              <Label className={LABEL}>Tags HelpDesk</Label>
              <Input {...register('helpdesk_tags')} placeholder="Ex: ANDI, BAND, sherwin.com" className={INPUT} />
              <p className="text-[10px] text-content-secondary/70 font-medium">
                Códigos do assunto ([CÓDIGO]) e/ou domínios de e-mail alternativos, separados por vírgula. Usado para casar chamados do HelpDesk com esta conta (o domínio do site também é usado).
              </p>
            </div>
          </CardContent>
        </Card>

        {/* ── BLOCO 2: LOCALIZAÇÃO ───────────────────────────────── */}
        <Card variant="glass" className="overflow-hidden border-none shadow-xl">
          <div className="h-[2px] bg-gradient-to-r from-emerald-500/80 to-teal-500/80" />
          <CardHeader className="px-8 pt-8 pb-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="p-2.5 rounded-xl bg-success/10 text-success shadow-inner">
                  <MapPin className="w-5 h-5" />
                </div>
                <div className="space-y-0.5">
                  <CardTitle className="text-foreground text-sm font-extrabold uppercase tracking-widest">Localização</CardTitle>
                  <p className="text-[10px] text-content-secondary font-medium tracking-wide">Geografia e Operação</p>
                </div>
              </div>
              <div className="flex items-center gap-3 px-4 py-2 bg-success/5 rounded-xl border border-success-500/10 self-center">
                <Label className="text-[10px] font-extrabold uppercase tracking-widest text-emerald-600 leading-none">Internacional</Label>
                <Switch
                  checked={isInternational}
                  onCheckedChange={(v) => setValue('is_international', v)}
                  className="data-[state=checked]:bg-success"
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
                    <Input
                      {...register('cep')}
                      onChange={(e) => {
                        isCepUserEdited.current = true
                        register('cep').onChange(e)
                      }}
                      placeholder="00000-000"
                      className={INPUT}
                    />
                    {searchingCep && <Loader2 className="w-3.5 h-3.5 animate-spin absolute right-3 top-3 text-success" />}
                  </div>
                </div>
              )}
              <div className={cn('space-y-2', isInternational ? 'md:col-span-4' : 'md:col-span-3')}>
                <Label className={LABEL}>Logradouro / Rua</Label>
                <Input {...register('street')} placeholder="Av. Paulista..." className={INPUT} />
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-6 gap-6">
              {isInternational && (
                <div className="space-y-2 md:col-span-2">
                  <Label className={LABEL}>País</Label>
                  <Input {...register('country')} placeholder="Ex: Argentina" className={INPUT} />
                </div>
              )}
              <div className="space-y-2 md:col-span-1">
                <Label className={LABEL}>Num</Label>
                <Input {...register('number')} placeholder="1000" className={INPUT} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className={LABEL}>Complemento</Label>
                <Input {...register('complement')} placeholder="Sala 42..." className={INPUT} />
              </div>
              <div className="space-y-2 md:col-span-1">
                <Label className={LABEL}>Bairro</Label>
                <Input {...register('neighborhood')} placeholder="Centro" className={INPUT} />
              </div>
              <div className="space-y-2 md:col-span-2">
                <Label className={LABEL}>Cidade</Label>
                <Input {...register('city')} placeholder="São Paulo" className={INPUT} />
              </div>
              <div className="space-y-2 md:col-span-1">
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
                  <CardTitle className="text-foreground text-sm font-extrabold uppercase tracking-widest">Gestão Comercial</CardTitle>
                  <p className="text-[10px] text-content-secondary font-medium tracking-wide">Contratos e Acordos Atuais</p>
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
                  contracted_hours_monthly: 0,
                  sla_use_global: true,
                  sla_levels: DEFAULT_SLA_LEVELS,
                  instance_url: '',
                })}
                className="h-10 px-5 rounded-xl text-[10px] font-extrabold uppercase tracking-widest gap-2 bg-primary/10 text-primary border-primary/20 hover:bg-primary/20"
              >
                <Plus className="w-4 h-4" /> Add Contrato
              </Button>
            </div>
          </CardHeader>
          <CardContent className="px-8 pb-10 space-y-6">
            {fields.length === 0 && (
              <div className="py-20 border-2 border-dashed border-border rounded-2xl flex flex-col items-center justify-center gap-4 text-muted-foreground/30">
                <div className="p-4 rounded-full bg-muted">
                  <FileText className="w-10 h-10" />
                </div>
                <p className="text-xs font-extrabold uppercase tracking-widest">Nenhum contrato cadastrado</p>
              </div>
            )}

            {fields.map((field, index) => (
              <Card key={field.id} className="bg-surface-card border-border/50 rounded-2xl p-6 relative group/card shadow-sm hover:shadow-md transition-all">
                <div className="absolute -top-3 -right-3 opacity-0 group-hover/card:opacity-100 transition-opacity z-20">
                  <Button type="button" variant="destructive" size="icon" onClick={() => remove(index)} className="h-8 w-8 rounded-full shadow-lg">
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>

                <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                  <div className="space-y-2">
                    <Label className={LABEL}>Código</Label>
                    <Input {...register(`contracts.${index}.contract_code`)} placeholder="CTR-XXXX" className="h-10 text-xs font-mono bg-surface-background/50 border-border/50" />
                  </div>
                  <div className="space-y-2">
                    <Label className={LABEL}>Status</Label>
                    <SearchableSelect
                      value={watch(`contracts.${index}.status`)}
                      onValueChange={(v) => setValue(`contracts.${index}.status`, v as any)}
                      className={cn(INPUT, "h-10 text-xs")}
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
                      className={cn(INPUT, "h-10 text-xs")}
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
                      className={cn(INPUT, "h-10 text-xs")}
                      options={[
                        ...plans.map(p => ({ label: p.name, value: p.name })),
                        { label: 'Custom', value: 'Custom' }
                      ]}
                    />
                  </div>

                  <div className="col-span-2 md:col-span-4 space-y-2">
                    <Label className={LABEL}>Instância (URL)</Label>
                    <Input {...register(`contracts.${index}.instance_url`)} placeholder="https://cliente.plannera.com.br" className="h-10 text-xs bg-surface-background/50 border-border/50" />
                    {errors.contracts?.[index]?.instance_url && (
                      <p className="text-destructive text-[10px] font-bold ml-1">{errors.contracts[index].instance_url.message}</p>
                    )}
                  </div>

                  {/* Financial Engine */}
                  <div className="col-span-2 space-y-4 p-5 bg-surface-background/30 rounded-2xl border border-border/50">
                    <div className="flex items-center justify-between">
                      <Label className="label-premium text-foreground">Financial Engine</Label>
                      <div className="flex items-center gap-1 bg-background/50 rounded-xl p-1 border border-border">
                        {(['standard', 'custom'] as const).map(type => {
                          const isSelected = watch(`contracts.${index}.pricing_type`) === type
                          return (
                            <button
                              key={type}
                              type="button"
                              onClick={() => setValue(`contracts.${index}.pricing_type`, type)}
                              className={cn(
                                'px-3 py-1 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition-all border',
                                isSelected && type === 'standard'
                                  ? 'bg-blue-500/20 text-blue-600 dark:text-blue-400 border-blue-500/30'
                                  : isSelected && type === 'custom'
                                  ? 'bg-amber-500/20 text-amber-600 dark:text-amber-400 border-amber-500/30'
                                  : 'text-muted-foreground/50 border-transparent hover:text-foreground hover:border-border'
                              )}
                            >
                              {type}
                            </button>
                          )
                        })}
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className={LABEL}>MRR Base</Label>
                      <MaskedInput
                        maskType="currency"
                        value={watch(`contracts.${index}.mrr`) || ''}
                        onValueChange={(value) => setValue(`contracts.${index}.mrr`, parseFloat(value) || 0)}
                        className={cn(INPUT, "h-11 text-lg font-black bg-muted border-primary/20")}
                      />
                    </div>
                    {watch(`contracts.${index}.pricing_type`) === 'custom' && (
                      <div className="space-y-2 pt-2 border-t border-border">
                        <Label className={LABEL}>Justificativa Custom</Label>
                        <Textarea
                          {...register(`contracts.${index}.pricing_explanation`)}
                          placeholder="Justificativa do pricing..."
                          className={cn(INPUT, "min-h-[80px] py-3 text-xs")}
                        />
                      </div>
                    )}
                  </div>


                  {/* Datas + Notas */}
                  <div className="col-span-2 space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <Label className={LABEL}>Início</Label>
                        <Input {...register(`contracts.${index}.start_date`)} type="date" className="h-10 text-xs bg-surface-background/50 border-border/50" />
                      </div>
                      <div className="space-y-2">
                        <Label className={LABEL}>Renovação</Label>
                        <Input {...register(`contracts.${index}.renewal_date`)} type="date" className="h-10 text-xs bg-surface-background/50 border-border/50" />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <Label className={LABEL}>Notas Rápidas</Label>
                      <Textarea {...register(`contracts.${index}.notes`)} className={cn(INPUT, "min-h-[80px] text-xs py-3")} placeholder="Observações do contrato..." />
                    </div>
                    {mode === 'edit' && (
                      <div className="flex justify-end pt-2">
                        <Button
                          type="button"
                          variant="premium"
                          onClick={() => saveContractIndividually(index)}
                          className="h-9 px-6 rounded-xl text-[10px] font-extrabold uppercase tracking-widest"
                        >
                          Salvar Contrato
                        </Button>
                      </div>
                    )}
                  </div>

                  {/* SLA do Contrato */}
                  <div className="col-span-2 md:col-span-4 space-y-6 p-5 bg-surface-background/30 rounded-2xl border border-border/50 mt-2">
                    <div className="flex items-center justify-between flex-wrap gap-4">
                      <div className="flex items-center gap-3">
                        <div className="p-2 rounded-lg bg-blue-500/10 text-blue-500">
                          <Shield className="w-5 h-5" />
                        </div>
                        <div className="space-y-0.5">
                          <Label className="label-premium text-foreground">SLA do Contrato</Label>
                          <p className="text-[10px] text-content-secondary font-medium tracking-wide">Prazos de resposta e resolução</p>
                        </div>
                      </div>
                      <div className="flex items-center gap-1 bg-background/50 rounded-xl p-1 border border-border">
                        <button
                          type="button"
                          onClick={() => setValue(`contracts.${index}.sla_use_global`, true)}
                          className={cn(
                            'px-4 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition-all flex items-center gap-2',
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
                            'px-4 py-1.5 rounded-lg text-[9px] font-extrabold uppercase tracking-widest transition-all flex items-center gap-2',
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
                        <p className="label-premium text-blue-500/80">
                          Herdando diretrizes da Política Global Plannera.
                        </p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        <div className="grid grid-cols-[140px_1fr_100px_100px] gap-4 items-center px-2">
                          <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Nível</span>
                          <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest">Labels do Cliente</span>
                          <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest text-center">1ª Resp</span>
                          <span className="text-[9px] font-extrabold text-muted-foreground uppercase tracking-widest text-center">Resolução</span>
                        </div>

                        {(watch(`contracts.${index}.sla_levels`) ?? DEFAULT_SLA_LEVELS).map((lvl, li) => {
                          const levelMeta = {
                            critical: { label: 'Crítico', color: 'text-red-500 border-red-500/20 bg-red-500/10' },
                            high:     { label: 'Alto',    color: 'text-orange-500 border-orange-500/20 bg-orange-500/10' },
                            medium:   { label: 'Médio',   color: 'text-warning border-warning-500/20 bg-warning/10' },
                            low:      { label: 'Baixo',   color: 'text-success border-success-500/20 bg-success/10' },
                          }[lvl.level]

                          return (
                            <Card key={lvl.level} className="grid grid-cols-[140px_1fr_100px_100px] gap-4 items-start p-4 rounded-xl bg-background/40 border-border group/sla">
                              <div className="pt-1.5">
                                <span className={cn('text-[10px] font-extrabold uppercase tracking-widest px-3 py-1.5 rounded-xl border block text-center', levelMeta?.color)}>
                                  {levelMeta?.label}
                                </span>
                              </div>

                              <div className="space-y-2">
                                <div className="flex flex-wrap gap-1.5">
                                  {(lvl.client_labels ?? []).map((label, labelIdx) => (
                                    <span
                                      key={labelIdx}
                                      className="inline-flex items-center gap-2 px-3 py-1 rounded-lg bg-muted text-[9px] font-extrabold text-foreground uppercase border border-border/50"
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
                                  className={cn(INPUT, "h-10 text-xs text-center font-mono")}
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
                                  className={cn(INPUT, "h-10 text-xs text-center font-mono")}
                                />
                                <span className="text-[8px] text-muted-foreground font-extrabold uppercase tracking-tighter">Min</span>
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
                                  className={cn(INPUT, "h-10 text-xs text-center font-mono")}
                                />
                                <span className="text-[8px] text-muted-foreground font-extrabold uppercase tracking-tighter">Min</span>
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

        {/* ── BLOCO 3.5: GOVERNANÇA COMERCIAL ────────────────────────── */}
        <Card variant="glass" className="overflow-hidden border-none shadow-xl">
          <div className="h-[2px] bg-gradient-to-r from-indigo-500/80 to-purple-500/80" />
          <CardContent className="px-8 py-8">
            <CommercialGovernanceForm 
              rules={watch('commercial_governance') || []} 
              contracts={watch('contracts') || []}
              onChange={(newRules) => setValue('commercial_governance', newRules)}
            />
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
                <CardTitle className="text-foreground text-sm font-extrabold uppercase tracking-widest">Faturamento e Time</CardTitle>
                <p className="text-[10px] text-content-secondary font-medium tracking-wide">Configurações administrativas</p>
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
              <Textarea {...register('billing_rules')} className={cn(INPUT, "min-h-[120px] py-4")} placeholder="Descreva acordos específicos e particularidades de faturamento..." />
            </div>

            <div className="h-px bg-border/50" />

            <div>
              <div className="flex items-center gap-3 mb-6">
                <div className="p-2 rounded-lg bg-primary/10 text-primary">
                  <Users className="w-4 h-4" />
                </div>
                <span className="label-premium text-foreground">Time Interno de Atendimento</span>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="space-y-2">
                  <Label className={LABEL}>CSM Responsável</Label>
                  <SearchableSelect
                    placeholder="Selecionar CSM..."
                    value={watch('csm_owner_id') || ''}
                    onValueChange={(v) => setValue('csm_owner_id', v === 'none' ? null : v)}
                    className={INPUT}
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
                    className={INPUT}
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


