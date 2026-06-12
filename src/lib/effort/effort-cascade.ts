import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recomputeItemDemand } from '@/lib/wishlist/demand'
import { recomputeItemDemand as recomputeOpportunityDemand } from '@/lib/opportunities/sizing'
import { runAutomatedAccountAnalysis } from '@/lib/ai/automated-account-analysis'
import { storeEmbeddings } from '@/lib/supabase/vector-search'

/**
 * Integridade dos dados derivados do esforço.
 *
 * Um `time_entry` (a "mensagem" de esforço) e a `interaction` que ele espelha
 * alimentam vários artefatos: wishlist_signals, opportunity_signals, embeddings
 * (RAG), csm_tasks sugeridas e onboarding_events. A FK `interactions.time_entry_id`
 * é ON DELETE CASCADE, mas wishlist/oportunidades/embeddings são polimórficos
 * (source_type/source_id, sem FK) e por isso NÃO caem sozinhos — viram órfãos.
 *
 * Além de apagar os derivados, ao remover a ÚLTIMA fonte de uma conta o risco
 * preditivo precisa ser ZERADO: `runPredictiveRiskAnalysis` não insere nada quando
 * não há interações/tickets, então a última avaliação `at-risk` (baseada no evento
 * removido) continuaria sendo a vigente. `clearRiskIfNoSignals` supera essa linha.
 *
 * Decisão de produto: SEM triggers no banco — a limpeza acontece neste caminho
 * único da aplicação, sempre precedida do diálogo de confirmação na UI.
 */

export interface EffortDeletionPreview {
  timeEntryId: string
  accountId: string | null
  interactions: number
  wishlistSignals: number
  opportunitySignals: number
  embeddings: number
  suggestedTasks: number
  keptTasks: number
  onboardingEvents: number
}

interface GatheredArtifacts {
  accountId: string | null
  interactionIds: string[]
  signalIds: string[]
  affectedItemIds: string[]
  oppSignalIds: string[]
  affectedOppItemIds: string[]
  suggestedTaskIds: string[]
  keptTaskCount: number
  onboardingEventCount: number
  embeddingCount: number
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherTimeEntryArtifacts(admin: any, timeEntryId: string): Promise<GatheredArtifacts | null> {
  const { data: te } = await admin
    .from('time_entries')
    .select('id, account_id')
    .eq('id', timeEntryId)
    .single()
  if (!te) return null
  const accountId: string | null = te.account_id ?? null

  // Interações espelho deste esforço
  const { data: ints } = await admin
    .from('interactions')
    .select('id')
    .eq('time_entry_id', timeEntryId)
  const interactionIds: string[] = (ints ?? []).map((i: any) => i.id)

  // Sinais de wishlist: deste time_entry OU das suas interações
  const allSignals = await gatherSignals(admin, 'wishlist_signals', timeEntryId, interactionIds)
  const signalIds: string[] = allSignals.map((s) => s.id)
  const affectedItemIds = Array.from(new Set(allSignals.map((s) => s.item_id).filter(Boolean))) as string[]

  // Sinais de oportunidade: idem (módulo criado depois — a cascade precisa cobrir)
  const allOpp = await gatherSignals(admin, 'opportunity_signals', timeEntryId, interactionIds)
  const oppSignalIds: string[] = allOpp.map((s) => s.id)
  const affectedOppItemIds = Array.from(new Set(allOpp.map((s) => s.item_id).filter(Boolean))) as string[]

  // csm_tasks vinculadas: sugeridas 'todo' são apagadas; iniciadas/concluídas são preservadas
  const { data: tasks } = await admin
    .from('csm_tasks')
    .select('id, status, completed_at, deleted_at')
    .eq('time_entry_id', timeEntryId)
  const suggestedTaskIds: string[] = []
  let keptTaskCount = 0
  for (const t of tasks ?? []) {
    const isOpen = t.status === 'todo' && !t.completed_at && !t.deleted_at
    if (isOpen) suggestedTaskIds.push(t.id)
    else keptTaskCount++
  }

  // onboarding_events: preservados (apenas desvinculados via SET NULL)
  const { count: onboardingEventCount } = await admin
    .from('onboarding_events')
    .select('id', { count: 'exact', head: true })
    .eq('time_entry_id', timeEntryId)

  const embeddingCount = await countEmbeddings(admin, timeEntryId, interactionIds, signalIds, oppSignalIds)

  return {
    accountId,
    interactionIds,
    signalIds,
    affectedItemIds,
    oppSignalIds,
    affectedOppItemIds,
    suggestedTaskIds,
    keptTaskCount,
    onboardingEventCount: onboardingEventCount ?? 0,
    embeddingCount,
  }
}

/** Coleta sinais (wishlist ou oportunidade) deste time_entry ou de suas interações. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function gatherSignals(admin: any, table: 'wishlist_signals' | 'opportunity_signals', timeEntryId: string, interactionIds: string[]): Promise<{ id: string; item_id: string | null }[]> {
  const { data: teRows } = await admin
    .from(table)
    .select('id, item_id')
    .eq('source_type', 'time_entry')
    .eq('source_id', timeEntryId)
  let intRows: any[] = []
  if (interactionIds.length > 0) {
    const { data } = await admin
      .from(table)
      .select('id, item_id')
      .eq('source_type', 'interaction')
      .in('source_id', interactionIds)
    intRows = data ?? []
  }
  return [...(teRows ?? []), ...intRows]
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countEmbeddings(admin: any, timeEntryId: string, interactionIds: string[], signalIds: string[], oppSignalIds: string[]): Promise<number> {
  let total = 0
  const add = async (sourceType: string, rawIds: string[]) => {
    const ids = rawIds.filter(Boolean)
    if (ids.length === 0) return
    const { count } = await admin
      .from('embeddings')
      .select('id', { count: 'exact', head: true })
      .eq('source_type', sourceType)
      .in('source_id', ids)
    total += count ?? 0
  }
  await add('time_entry', [timeEntryId])
  await add('interaction', interactionIds)
  await add('wishlist_signal', signalIds)
  await add('opportunity_signal', oppSignalIds)
  return total
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteEmbeddings(admin: any, sourceType: string, rawIds: string[]) {
  const ids = rawIds.filter(Boolean)
  if (ids.length === 0) return
  await admin.from('embeddings').delete().eq('source_type', sourceType).in('source_id', ids)
}

/**
 * Ao remover a ÚLTIMA fonte de risco de uma conta (sem interações nem tickets), o
 * motor preditivo não gera nova avaliação — então a última `at-risk` (baseada no
 * evento removido) continuaria vigente. Aqui inserimos uma avaliação NEUTRA que
 * supera a antiga e resolvemos alertas proativos de risco que ficaram sem base.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function clearRiskIfNoSignals(admin: any, accountId: string) {
  const [{ count: ints }, { count: tks }] = await Promise.all([
    admin.from('interactions').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
    admin.from('support_tickets').select('id', { count: 'exact', head: true }).eq('account_id', accountId),
  ])
  if ((ints ?? 0) > 0 || (tks ?? 0) > 0) return

  await admin.from('account_risk_assessments').insert({
    account_id: accountId,
    risk_score: 0,
    sentiment_label: 'neutral',
    ai_reasoning: 'Risco reavaliado após remoção de registros: a conta não possui interações nem tickets recentes que sustentem risco.',
  })
  await admin
    .from('proactive_alerts')
    .update({ resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('account_id', accountId)
    .is('resolved_at', null)
    .in('type', ['churn_risk', 'playbook_trigger'])
}

/** Reavaliação da conta após exclusão: re-análise + zera risco se não há mais sinais. */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function reevaluateAccount(admin: any, accountId: string, userId: string | undefined, source: string) {
  try { await runAutomatedAccountAnalysis(accountId, userId, source) } catch (e) { console.error('[effort-cascade] reanalysis error:', e) }
  try { await clearRiskIfNoSignals(admin, accountId) } catch (e) { console.error('[effort-cascade] clearRisk error:', e) }
}

/**
 * Retorna o raio de impacto da exclusão de um esforço (sem apagar nada).
 * Use para alimentar o diálogo de confirmação na UI.
 */
export async function getEffortDeletionPreview(timeEntryId: string): Promise<EffortDeletionPreview | null> {
  const admin = getSupabaseAdminClient() as any
  const g = await gatherTimeEntryArtifacts(admin, timeEntryId)
  if (!g) return null
  return {
    timeEntryId,
    accountId: g.accountId,
    interactions: g.interactionIds.length,
    wishlistSignals: g.signalIds.length,
    opportunitySignals: g.oppSignalIds.length,
    embeddings: g.embeddingCount,
    suggestedTasks: g.suggestedTaskIds.length,
    keptTasks: g.keptTaskCount,
    onboardingEvents: g.onboardingEventCount,
  }
}

/**
 * Raio de impacto da exclusão a partir de uma INTERAÇÃO (timeline). Se ela espelha
 * um esforço, reaproveita o preview do esforço; senão conta os derivados da interação avulsa.
 */
export async function getInteractionDeletionPreview(interactionId: string): Promise<EffortDeletionPreview | null> {
  const admin = getSupabaseAdminClient() as any
  const { data: interaction } = await admin
    .from('interactions')
    .select('id, account_id, time_entry_id')
    .eq('id', interactionId)
    .single()
  if (!interaction) return null
  if (interaction.time_entry_id) return getEffortDeletionPreview(interaction.time_entry_id)

  const wl = await gatherSignals(admin, 'wishlist_signals', '', [interactionId])
  const opp = await gatherSignals(admin, 'opportunity_signals', '', [interactionId])
  const signalIds = wl.map((s) => s.id)
  const oppSignalIds = opp.map((s) => s.id)
  const embeddings = await countEmbeddings(admin, '', [interactionId], signalIds, oppSignalIds)
  return {
    timeEntryId: '',
    accountId: interaction.account_id ?? null,
    interactions: 1,
    wishlistSignals: signalIds.length,
    opportunitySignals: oppSignalIds.length,
    embeddings,
    suggestedTasks: 0,
    keptTasks: 0,
    onboardingEvents: 0,
  }
}

export interface CascadeResult {
  deleted: {
    timeEntry: number
    interactions: number
    wishlistSignals: number
    opportunitySignals: number
    embeddings: number
    suggestedTasks: number
  }
  itemsRecomputed: number
}

/**
 * Apaga um esforço e TODOS os seus derivados em conjunto, na ordem segura:
 * embeddings (RAG) → wishlist/opportunity signals → csm_tasks sugeridas → time_entry
 * (interações caem por cascade). Depois recalcula a demanda dos itens de wishlist/
 * oportunidade afetados e reavalia saúde/risco da conta (zerando o risco se a fonte
 * removida era a última).
 */
export async function deleteEffortCascade(timeEntryId: string, userId?: string): Promise<CascadeResult> {
  const admin = getSupabaseAdminClient() as any
  const g = await gatherTimeEntryArtifacts(admin, timeEntryId)
  if (!g) {
    return { deleted: { timeEntry: 0, interactions: 0, wishlistSignals: 0, opportunitySignals: 0, embeddings: 0, suggestedTasks: 0 }, itemsRecomputed: 0 }
  }

  // 1) Embeddings (RAG) — interação, time_entry e sinais de wishlist/oportunidade
  await deleteEmbeddings(admin, 'time_entry', [timeEntryId])
  await deleteEmbeddings(admin, 'interaction', g.interactionIds)
  await deleteEmbeddings(admin, 'wishlist_signal', g.signalIds)
  await deleteEmbeddings(admin, 'opportunity_signal', g.oppSignalIds)

  // 2) Sinais de wishlist e oportunidade
  if (g.signalIds.length > 0) await admin.from('wishlist_signals').delete().in('id', g.signalIds)
  if (g.oppSignalIds.length > 0) await admin.from('opportunity_signals').delete().in('id', g.oppSignalIds)

  // 3) Tarefas sugeridas em aberto (preserva iniciadas/concluídas — viram time_entry_id NULL)
  if (g.suggestedTaskIds.length > 0) {
    await admin.from('csm_tasks').delete().in('id', g.suggestedTaskIds)
  }

  // 4) O esforço (interações espelho caem por cascade da FK)
  await admin.from('time_entries').delete().eq('id', timeEntryId)

  // 5) Recalcula demanda dos itens de wishlist e oportunidade afetados
  let itemsRecomputed = 0
  for (const itemId of g.affectedItemIds) {
    try { await recomputeItemDemand(itemId); itemsRecomputed++ } catch (e) { console.error('[effort-cascade] recompute wishlist demand error:', e) }
  }
  for (const itemId of g.affectedOppItemIds) {
    try { await recomputeOpportunityDemand(itemId); itemsRecomputed++ } catch (e) { console.error('[effort-cascade] recompute opp demand error:', e) }
  }

  // 6) Reavalia a conta (e zera risco se não sobraram sinais)
  if (g.accountId) await reevaluateAccount(admin, g.accountId, userId, 'effort_delete')

  return {
    deleted: {
      timeEntry: 1,
      interactions: g.interactionIds.length,
      wishlistSignals: g.signalIds.length,
      opportunitySignals: g.oppSignalIds.length,
      embeddings: g.embeddingCount,
      suggestedTasks: g.suggestedTaskIds.length,
    },
    itemsRecomputed,
  }
}

/**
 * Reavaliação após EDITAR um esforço (sem diálogo). Mantém os derivados coerentes:
 *  - Re-vetoriza o embedding da interação (conteúdo/data/tipo mudaram → RAG desatualiza).
 *  - Se a CONTA mudou, propaga `account_id` para os sinais (wishlist + oportunidade)
 *    deste esforço e seus embeddings (senão a demanda fica atribuída à conta errada).
 * Não re-extrai sinais: o texto-fonte (`natural_language_input`) não é editável por
 * esta rota, então os sinais já extraídos seguem válidos.
 */
export async function reevaluateEffortOnEdit(params: {
  timeEntryId: string
  interactionId: string | null
  accountId: string
  oldAccountId?: string | null
  accountName: string
  date: string
  activityType: string
  text: string
}): Promise<void> {
  const admin = getSupabaseAdminClient() as any
  const { timeEntryId, interactionId, accountId, oldAccountId, accountName, date, activityType, text } = params

  // Conta mudou: realoca sinais (wishlist + oportunidade) e seus embeddings para a nova conta
  if (oldAccountId && oldAccountId !== accountId) {
    for (const table of ['wishlist_signals', 'opportunity_signals'] as const) {
      const embType = table === 'wishlist_signals' ? 'wishlist_signal' : 'opportunity_signal'
      const { data: sigs } = await admin.from(table).select('id').eq('source_type', 'time_entry').eq('source_id', timeEntryId)
      const sigIds: string[] = (sigs ?? []).map((s: any) => s.id)
      if (sigIds.length > 0) {
        await admin.from(table).update({ account_id: accountId }).in('id', sigIds)
        await admin.from('embeddings').update({ account_id: accountId }).eq('source_type', embType).in('source_id', sigIds)
      }
    }
  }

  // Re-vetoriza a interação (storeEmbeddings já remove os chunks antigos do source)
  if (interactionId && text && text.trim().length > 0) {
    const chunk = `Interação | ${accountName} | ${date} | Tipo: ${activityType}\n${text}`
    try { await storeEmbeddings(accountId, 'interaction', interactionId, chunk) } catch (e) { console.error('[effort-cascade] re-embed error:', e) }
  }
}

/**
 * Exclusão a partir de uma interação (ex.: timeline). Se a interação espelha um
 * esforço (`time_entry_id` preenchido), delega para a cascade do esforço. Caso
 * contrário, apaga a interação avulsa e seus derivados (wishlist + oportunidade + embeddings).
 */
export async function deleteInteractionCascade(interactionId: string, userId?: string): Promise<CascadeResult> {
  const admin = getSupabaseAdminClient() as any
  const { data: interaction } = await admin
    .from('interactions')
    .select('id, account_id, time_entry_id')
    .eq('id', interactionId)
    .single()
  if (!interaction) {
    return { deleted: { timeEntry: 0, interactions: 0, wishlistSignals: 0, opportunitySignals: 0, embeddings: 0, suggestedTasks: 0 }, itemsRecomputed: 0 }
  }

  // Espelho de esforço → cascade pelo time_entry
  if (interaction.time_entry_id) {
    return deleteEffortCascade(interaction.time_entry_id, userId)
  }

  // Interação avulsa: sinais (wishlist + oportunidade) sourced nela + embeddings
  const wl = await gatherSignals(admin, 'wishlist_signals', '', [interactionId])
  const opp = await gatherSignals(admin, 'opportunity_signals', '', [interactionId])
  const signalIds = wl.map((s) => s.id)
  const oppSignalIds = opp.map((s) => s.id)
  const affectedItemIds = Array.from(new Set(wl.map((s) => s.item_id).filter(Boolean))) as string[]
  const affectedOppItemIds = Array.from(new Set(opp.map((s) => s.item_id).filter(Boolean))) as string[]

  const embeddingCount = await countEmbeddings(admin, '', [interactionId], signalIds, oppSignalIds)

  await deleteEmbeddings(admin, 'interaction', [interactionId])
  await deleteEmbeddings(admin, 'wishlist_signal', signalIds)
  await deleteEmbeddings(admin, 'opportunity_signal', oppSignalIds)
  if (signalIds.length > 0) await admin.from('wishlist_signals').delete().in('id', signalIds)
  if (oppSignalIds.length > 0) await admin.from('opportunity_signals').delete().in('id', oppSignalIds)
  await admin.from('interactions').delete().eq('id', interactionId)

  let itemsRecomputed = 0
  for (const itemId of affectedItemIds) {
    try { await recomputeItemDemand(itemId); itemsRecomputed++ } catch (e) { console.error('[effort-cascade] recompute wishlist demand error:', e) }
  }
  for (const itemId of affectedOppItemIds) {
    try { await recomputeOpportunityDemand(itemId); itemsRecomputed++ } catch (e) { console.error('[effort-cascade] recompute opp demand error:', e) }
  }
  if (interaction.account_id) await reevaluateAccount(admin, interaction.account_id, userId, 'interaction_delete')

  return {
    deleted: { timeEntry: 0, interactions: 1, wishlistSignals: signalIds.length, opportunitySignals: oppSignalIds.length, embeddings: embeddingCount, suggestedTasks: 0 },
    itemsRecomputed,
  }
}
