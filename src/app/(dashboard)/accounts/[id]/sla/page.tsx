import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { SLAPolicyEditor } from '@/components/support/SLAPolicyEditor'
import { LevelMappingEditor } from '@/components/support/LevelMappingEditor'
import { ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'

export default async function AccountSLASettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const admin = getSupabaseAdminClient()

  // 1. Get account details (will verify account ownership or role via RLS)
  const { data: account, error: accountError } = await supabase
    .from('accounts')
    .select('*, contracts(*)')
    .eq('id', id)
    .single()

  if (accountError || !account) notFound()

  const contracts = Array.isArray(account.contracts)
    ? account.contracts
    : account.contracts ? [account.contracts] : []

  const activeContract = contracts.find((c: any) => c.status === 'active') || contracts[0]

  // 2. Fetch custom SLA policy for this account (using admin client to bypass restrictive RLS policies for loaded users)
  const { data: existingPolicy, error: policyFetchError } = await admin
    .from('sla_policies')
    .select(`*, levels:sla_policy_levels(*), mappings:sla_level_mappings(*)`)
    .eq('account_id', id)
    .eq('is_active', true)
    .maybeSingle()

  let currentPolicy = existingPolicy ?? null
  let isGlobalDefault = false

  // 3. If no custom SLA exists, fetch the global standard SLA policy so they can view it
  if (!currentPolicy && !policyFetchError) {
    const { data: globalPolicy } = await admin
      .from('sla_policies')
      .select(`*, levels:sla_policy_levels(*), mappings:sla_level_mappings(*)`)
      .eq('is_global', true)
      .eq('is_active', true)
      .maybeSingle()

    if (globalPolicy) {
      currentPolicy = globalPolicy
      isGlobalDefault = true
    }
  }

  const tableError = policyFetchError?.message?.includes('does not exist')

  return (
    <PageContainer className="space-y-6">
      <div className="flex items-center justify-between">
        <ModuleHeader 
          title="Configuração de SLA" 
          subtitle={`Políticas de SLA para ${account.name}`}
          iconName="ShieldCheck"
        />
        <Link href={`/accounts/${id}`} className="shrink-0">
          <button className="flex items-center gap-2 px-4 py-2 text-xs font-black uppercase tracking-widest text-content-secondary hover:text-content-primary transition-colors border border-border-divider rounded-xl bg-surface-background">
            <ArrowLeft className="w-4 h-4" />
            Voltar
          </button>
        </Link>
      </div>

      {/* Migration not applied */}
      {tableError && (
        <div className="p-6 rounded-2xl border border-plannera-demand/20 bg-plannera-demand/5 flex items-start gap-3 animate-in fade-in slide-in-from-top-2">
          <AlertTriangle className="w-5 h-5 text-plannera-demand shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-plannera-demand font-black text-[11px] uppercase tracking-widest">Migração pendente</p>
            <p className="text-content-secondary text-sm">
              A tabela <code className="font-mono bg-black/20 px-1 rounded">sla_policies</code> não existe no banco.
              Aplique a migração <code className="font-mono bg-black/20 px-1 rounded">012_support_sla.sql</code> no Supabase antes de configurar SLA.
            </p>
          </div>
        </div>
      )}

      {/* Global standard SLA notice */}
      {!tableError && isGlobalDefault && currentPolicy && (
        <div className="p-5 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex flex-col md:flex-row md:items-center md:justify-between gap-4 animate-in fade-in">
          <div className="flex items-start md:items-center gap-3">
            <ShieldCheck className="w-6 h-6 text-amber-500 shrink-0 mt-0.5 md:mt-0" />
            <div>
              <p className="text-content-primary font-bold text-xs uppercase tracking-widest">
                Utilizando SLA Padrão Plannera
              </p>
              <p className="text-content-secondary text-xs mt-1">
                Esta conta está herdando a política de SLA global de forma padrão. Clique ao lado para criar regras customizadas de suporte para esta conta.
              </p>
            </div>
          </div>
          <form action={async () => {
            'use server'
            const adminClient = getSupabaseAdminClient()
            if (activeContract) {
              // 1. Create custom policy
              const { data: newPolicy, error: insErr } = await adminClient
                .from('sla_policies')
                .insert({
                  account_id: id,
                  contract_id: activeContract.id,
                  alert_threshold_pct: currentPolicy?.alert_threshold_pct ?? 25,
                  auto_close_hours: currentPolicy?.auto_close_hours ?? 48,
                  timezone: currentPolicy?.timezone ?? 'America/Sao_Paulo',
                  is_active: true,
                  is_global: false
                })
                .select()
                .single()

              if (!insErr && newPolicy?.id && currentPolicy?.levels) {
                // 2. Clone levels
                const levelsToInsert = currentPolicy.levels.map((lvl: any) => ({
                  policy_id: newPolicy.id,
                  level: lvl.level,
                  first_response_minutes: lvl.first_response_minutes,
                  resolution_minutes: lvl.resolution_minutes
                }))
                await adminClient.from('sla_policy_levels').insert(levelsToInsert)

                // 3. Clone mappings
                if (currentPolicy.mappings && currentPolicy.mappings.length > 0) {
                  const mappingsToInsert = currentPolicy.mappings.map((mp: any) => ({
                    policy_id: newPolicy.id,
                    external_label: mp.external_label,
                    internal_level: mp.internal_level
                  }))
                  await adminClient.from('sla_level_mappings').insert(mappingsToInsert)
                }
              }
            }
          }}>
            <button type="submit" className="w-full md:w-auto px-5 py-2.5 bg-amber-500 hover:bg-amber-600 text-white font-extrabold text-[10px] uppercase tracking-widest rounded-xl transition-all shadow-md active:scale-95 cursor-pointer">
              Criar Política Customizada
            </button>
          </form>
        </div>
      )}

      {/* No active contract warning */}
      {!tableError && !currentPolicy && (
        <div className="p-12 text-center border border-dashed border-border-divider rounded-2xl bg-surface-card/40 space-y-4">
          <div className="w-16 h-16 bg-surface-card rounded-2xl flex items-center justify-center mx-auto shadow-inner border border-border-divider/50">
            <ShieldCheck className="w-8 h-8 text-content-secondary opacity-20" />
          </div>
          <div className="space-y-1">
            <p className="text-content-primary font-black uppercase tracking-tight text-lg">Nenhum contrato ativo</p>
            <p className="text-content-secondary text-sm max-w-xs mx-auto">
              Associe um contrato ativo a esta conta para configurar a política de SLA customizada.
            </p>
          </div>
        </div>
      )}

      {/* Editors */}
      {!tableError && currentPolicy?.id && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <section className="bg-surface-card border border-border-divider shadow-xl p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-plannera-orange/40 to-transparent" />
            <SLAPolicyEditor
              policyId={currentPolicy.id}
              initialLevels={(currentPolicy.levels || []) as any}
              readOnly={isGlobalDefault}
            />
          </section>
          <section className="bg-surface-card border border-border-divider shadow-xl p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/40 to-transparent" />
            <LevelMappingEditor
              policyId={currentPolicy.id}
              initialMappings={(currentPolicy.mappings || []) as any}
              readOnly={isGlobalDefault}
            />
          </section>
        </div>
      )}
    </PageContainer>
  )
}
