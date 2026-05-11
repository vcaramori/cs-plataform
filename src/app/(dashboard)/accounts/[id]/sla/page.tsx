import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { SLAPolicyEditor } from '@/components/support/SLAPolicyEditor'
import { LevelMappingEditor } from '@/components/support/LevelMappingEditor'
import { ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react'
import Link from 'next/link'
import { PageContainer } from '@/components/ui/page-container'
import { ModuleHeader } from '@/components/shared/guardians/ModuleHeader'
import { motion } from 'framer-motion'

export default async function AccountSLASettings({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()

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

  // Busca política existente
  const { data: existingPolicy, error: policyFetchError } = await supabase
    .from('sla_policies')
    .select(`*, levels:sla_policy_levels(*), mappings:sla_level_mappings(*)`)
    .eq('account_id', id)
    .eq('is_active', true)
    .maybeSingle()

  let currentPolicy = existingPolicy ?? null

  // Se não existe política mas há contrato, cria automaticamente
  if (!currentPolicy && !policyFetchError && activeContract) {
    const { data: newPolicy, error: insertError } = await supabase
      .from('sla_policies')
      .insert({
        account_id: id,
        contract_id: activeContract.id,
        alert_threshold_pct: 25,
        auto_close_hours: 48,
        timezone: 'America/Sao_Paulo',
        is_active: true,
      })
      .select()
      .single()

    if (!insertError && newPolicy?.id) {
      currentPolicy = { ...newPolicy, levels: [], mappings: [] }
    }
  }

  const tableError = policyFetchError?.message?.includes('does not exist')

  return (
    <PageContainer className="space-y-6">
      <ModuleHeader 
        title="Configuração de SLA" 
        subtitle={`Políticas customizadas para ${account.name}`}
        iconName="ShieldCheck"
      />

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

      {/* No contract */}
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
            />
          </section>
          <section className="bg-surface-card border border-border-divider shadow-xl p-8 rounded-2xl relative overflow-hidden">
            <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-indigo-500/40 to-transparent" />
            <LevelMappingEditor
              policyId={currentPolicy.id}
              initialMappings={(currentPolicy.mappings || []) as any}
            />
          </section>
        </div>
      )}
    </PageContainer>
  )
}
