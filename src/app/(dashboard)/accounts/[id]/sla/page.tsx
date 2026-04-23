import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { SLAPolicyEditor } from '@/components/support/SLAPolicyEditor'
import { LevelMappingEditor } from '@/components/support/LevelMappingEditor'
import { ArrowLeft, ShieldCheck, AlertTriangle } from 'lucide-react'
import Link from 'next/link'

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
    <div className="p-6 space-y-6 max-w-5xl">
      {/* Header */}
      <div className="flex items-center gap-4">
        <Link
          href={`/accounts/${id}`}
          className="p-2 rounded-xl hover:bg-white/5 transition-colors text-slate-400 hover:text-white border border-white/5"
        >
          <ArrowLeft className="w-4 h-4" />
        </Link>
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center">
            <ShieldCheck className="w-4 h-4 text-indigo-400" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight">Configurações de SLA</h1>
            <p className="text-slate-500 text-sm">{account.name}</p>
          </div>
        </div>
      </div>

      {/* Migration not applied */}
      {tableError && (
        <div className="p-6 rounded-2xl border border-amber-500/20 bg-amber-500/5 flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <p className="text-amber-300 font-semibold text-sm">Migração pendente</p>
            <p className="text-amber-500/70 text-sm">
              A tabela <code className="font-mono bg-black/20 px-1 rounded">sla_policies</code> não existe no banco.
              Aplique a migração <code className="font-mono bg-black/20 px-1 rounded">012_support_sla.sql</code> no Supabase antes de configurar SLA.
            </p>
          </div>
        </div>
      )}

      {/* No contract */}
      {!tableError && !currentPolicy && (
        <div className="p-8 text-center border border-dashed border-white/10 rounded-2xl bg-black/20 space-y-2">
          <ShieldCheck className="w-8 h-8 text-slate-600 mx-auto" />
          <p className="text-white font-semibold">Nenhum contrato ativo</p>
          <p className="text-slate-500 text-sm">
            Associe um contrato ativo a esta conta para configurar a política de SLA.
          </p>
        </div>
      )}

      {/* Editors */}
      {!tableError && currentPolicy?.id && (
        <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-2xl border-none">
            <SLAPolicyEditor
              policyId={currentPolicy.id}
              initialLevels={currentPolicy.levels || []}
            />
          </section>
          <section className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-sm p-6 rounded-2xl border-none">
            <LevelMappingEditor
              policyId={currentPolicy.id}
              initialMappings={currentPolicy.mappings || []}
            />
          </section>
        </div>
      )}
    </div>
  )
}
