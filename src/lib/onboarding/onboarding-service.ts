/**
 * Serviço de onboarding: regras de negócio reusadas pelas rotas de API.
 * Mantém o status/etapa do contrato derivados do checklist (milestones).
 * Recálculo é app-side (não trigger) — mais testável e seguro em produção.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any

export type RecomputeResult = {
  current_stage: string | null
  status: string
  completed: boolean
} | null

/**
 * Cria os milestones de um contrato a partir do catálogo de etapas ativas.
 * Idempotente: usa upsert por (contract_id, stage_key).
 */
export async function seedMilestonesForContract(
  admin: Admin,
  contractId: string,
  accountId: string
): Promise<number> {
  const { data: stages, error } = await admin
    .from('onboarding_stages')
    .select('key, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw new Error(`Erro ao ler etapas: ${error.message}`)

  const rows = (stages ?? []).map((s: any) => ({
    contract_id: contractId,
    account_id: accountId,
    stage_key: s.key,
    status: 'pending',
    sort_order: s.sort_order,
  }))
  if (rows.length === 0) return 0

  const { error: upErr } = await admin
    .from('onboarding_milestones')
    .upsert(rows, { onConflict: 'contract_id,stage_key', ignoreDuplicates: true })
  if (upErr) throw new Error(`Erro ao criar milestones: ${upErr.message}`)
  return rows.length
}

/**
 * Recalcula a etapa atual e o status de onboarding do contrato a partir dos
 * milestones. Preserva estados manuais 'on-hold' e 'cancelled'.
 */
export async function recomputeContractOnboarding(
  admin: Admin,
  contractId: string
): Promise<RecomputeResult> {
  const { data: ms } = await admin
    .from('onboarding_milestones')
    .select('stage_key, status, sort_order')
    .eq('contract_id', contractId)
    .order('sort_order')

  const milestones = (ms ?? []) as { stage_key: string; status: string; sort_order: number }[]
  if (milestones.length === 0) return null

  const pending = milestones.filter((m) => m.status !== 'done' && m.status !== 'skipped')
  const allDone = pending.length === 0
  const currentStage = allDone ? null : pending[0].stage_key

  const { data: contract } = await admin
    .from('contracts')
    .select('onboarding_status')
    .eq('id', contractId)
    .single()
  const curStatus: string = contract?.onboarding_status ?? 'not-started'

  let status = curStatus
  if (curStatus !== 'on-hold' && curStatus !== 'cancelled') {
    status = allDone ? 'completed' : 'in-progress'
  }

  const patch: Record<string, unknown> = {
    onboarding_current_stage: currentStage,
    onboarding_status: status,
    onboarding_completed_at: status === 'completed' ? new Date().toISOString() : null,
  }

  await admin.from('contracts').update(patch).eq('id', contractId)
  return { current_stage: currentStage, status, completed: allDone }
}
