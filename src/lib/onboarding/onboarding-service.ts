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

/** Soma dias a uma data 'YYYY-MM-DD' e devolve 'YYYY-MM-DD' (UTC, sem fuso). */
export function addDays(isoDate: string, days: number): string {
  const d = new Date(`${isoDate.slice(0, 10)}T00:00:00Z`)
  d.setUTCDate(d.getUTCDate() + days)
  return d.toISOString().slice(0, 10)
}

/**
 * Cria os milestones de um contrato a partir de um TEMPLATE, calculando as
 * datas (planned_date = início + offset_days; planned_end quando duration>0).
 * Retorna a contagem e o nome do 1º marco (p/ definir a etapa atual).
 */
export async function seedMilestonesFromTemplate(
  admin: Admin,
  contractId: string,
  accountId: string,
  templateId: string,
  startDate: string
): Promise<{ count: number; firstName: string | null }> {
  const { data: items, error } = await admin
    .from('onboarding_template_items')
    .select('*')
    .eq('template_id', templateId)
    .order('sort_order')
  if (error) throw new Error(`Erro ao ler itens do template: ${error.message}`)

  const rows = (items ?? []).map((it: any) => ({
    contract_id: contractId,
    account_id: accountId,
    template_item_id: it.id,
    stage_key: null,
    name: it.name,
    milestone_type: it.milestone_type,
    status: 'pending',
    planned_date: addDays(startDate, it.offset_days ?? 0),
    planned_end: (it.duration_days ?? 0) > 0 ? addDays(startDate, (it.offset_days ?? 0) + it.duration_days) : null,
    sort_order: it.sort_order ?? 0,
  }))
  if (rows.length === 0) return { count: 0, firstName: null }

  const { error: insErr } = await admin.from('onboarding_milestones').insert(rows)
  if (insErr) throw new Error(`Erro ao criar milestones: ${insErr.message}`)
  return { count: rows.length, firstName: rows[0]?.name ?? null }
}

/**
 * (Legado) Cria os milestones a partir do catálogo fixo de etapas.
 * Mantido para compatibilidade; o fluxo novo usa seedMilestonesFromTemplate.
 */
export async function seedMilestonesForContract(
  admin: Admin,
  contractId: string,
  accountId: string
): Promise<number> {
  const { data: stages, error } = await admin
    .from('onboarding_stages')
    .select('key, label, sort_order')
    .eq('is_active', true)
    .order('sort_order')
  if (error) throw new Error(`Erro ao ler etapas: ${error.message}`)

  const rows = (stages ?? []).map((s: any) => ({
    contract_id: contractId,
    account_id: accountId,
    stage_key: s.key,
    name: s.label ?? s.key,
    status: 'pending',
    sort_order: s.sort_order,
  }))
  if (rows.length === 0) return 0

  const { error: insErr } = await admin.from('onboarding_milestones').insert(rows)
  if (insErr) throw new Error(`Erro ao criar milestones: ${insErr.message}`)
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
    .select('name, stage_key, status, sort_order')
    .eq('contract_id', contractId)
    .order('sort_order')

  const milestones = (ms ?? []) as { name: string | null; stage_key: string | null; status: string; sort_order: number }[]
  if (milestones.length === 0) return null

  const pending = milestones.filter((m) => m.status !== 'done' && m.status !== 'skipped')
  const allDone = pending.length === 0
  const currentStage = allDone ? null : (pending[0].name ?? pending[0].stage_key)

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
