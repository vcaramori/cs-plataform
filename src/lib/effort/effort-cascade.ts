import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { recomputeItemDemand } from '@/lib/wishlist/demand'
import { runAutomatedAccountAnalysis } from '@/lib/ai/automated-account-analysis'
import { storeEmbeddings } from '@/lib/supabase/vector-search'

/**
 * Integridade dos dados derivados do esforço.
 *
 * Um `time_entry` (a "mensagem" de esforço) e a `interaction` que ele espelha
 * alimentam vários artefatos: wishlist_signals, embeddings (RAG), csm_tasks
 * sugeridas e onboarding_events. A FK `interactions.time_entry_id` é ON DELETE
 * CASCADE, mas wishlist/embeddings são polimórficos (source_type/source_id, sem
 * FK) e por isso NÃO caem sozinhos — viram órfãos.
 *
 * Este módulo centraliza:
 *  - `getEffortDeletionPreview` → o "raio de impacto" (para o diálogo de confirmação).
 *  - `deleteEffortCascade` → exclusão em conjunto, na ordem segura, + recompute de
 *    demanda da wishlist + reavaliação de saúde/risco da conta.
 *  - `deleteInteractionCascade` → exclusão a partir de uma interação (timeline). Se a
 *    interação espelha um esforço, delega para a cascade do time_entry.
 *
 * Decisão de produto: SEM triggers no banco — a limpeza acontece neste caminho
 * único da aplicação, sempre precedida do diálogo de confirmação na UI.
 */

export interface EffortDeletionPreview {
  timeEntryId: string
  accountId: string | null
  /** interações espelho que serão removidas (cascade da FK) */
  interactions: number
  /** sinais de wishlist (deste esforço ou das suas interações) que serão apagados */
  wishlistSignals: number
  /** trechos do RAG (embeddings) que serão apagados */
  embeddings: number
  /** tarefas sugeridas (todo) vinculadas que serão apagadas */
  suggestedTasks: number
  /** tarefas já iniciadas/concluídas que serão apenas DESVINCULADAS (preservadas) */
  keptTasks: number
  /** eventos de onboarding que serão apenas DESVINCULADOS (preservados) */
  onboardingEvents: number
}

interface GatheredArtifacts {
  accountId: string | null
  interactionIds: string[]
  signalIds: string[]
  affectedItemIds: string[]
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
  const { data: teSignals } = await admin
    .from('wishlist_signals')
    .select('id, item_id')
    .eq('source_type', 'time_entry')
    .eq('source_id', timeEntryId)

  let intSignals: any[] = []
  if (interactionIds.length > 0) {
    const { data } = await admin
      .from('wishlist_signals')
      .select('id, item_id')
      .eq('source_type', 'interaction')
      .in('source_id', interactionIds)
    intSignals = data ?? []
  }
  const allSignals = [...(teSignals ?? []), ...intSignals]
  const signalIds: string[] = allSignals.map((s: any) => s.id)
  const affectedItemIds = Array.from(
    new Set(allSignals.map((s: any) => s.item_id).filter(Boolean))
  ) as string[]

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

  // Embeddings a remover: time_entry + interações + sinais de wishlist
  const embeddingCount = await countEmbeddings(admin, timeEntryId, interactionIds, signalIds)

  return {
    accountId,
    interactionIds,
    signalIds,
    affectedItemIds,
    suggestedTaskIds,
    keptTaskCount,
    onboardingEventCount: onboardingEventCount ?? 0,
    embeddingCount,
  }
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function countEmbeddings(admin: any, timeEntryId: string, interactionIds: string[], signalIds: string[]): Promise<number> {
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
  return total
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
async function deleteEmbeddings(admin: any, sourceType: string, rawIds: string[]) {
  const ids = rawIds.filter(Boolean)
  if (ids.length === 0) return
  await admin.from('embeddings').delete().eq('source_type', sourceType).in('source_id', ids)
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

  const { data: signals } = await admin
    .from('wishlist_signals')
    .select('id')
    .eq('source_type', 'interaction')
    .eq('source_id', interactionId)
  const signalIds: string[] = (signals ?? []).map((s: any) => s.id)
  const embeddings = await countEmbeddings(admin, '', [interactionId], signalIds)
  return {
    timeEntryId: '',
    accountId: interaction.account_id ?? null,
    interactions: 1,
    wishlistSignals: signalIds.length,
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
    embeddings: number
    suggestedTasks: number
  }
  itemsRecomputed: number
}

/**
 * Apaga um esforço e TODOS os seus derivados em conjunto, na ordem segura:
 * embeddings (RAG) → wishlist_signals → csm_tasks sugeridas → time_entry
 * (interações caem por cascade). Depois recalcula a demanda dos itens de
 * wishlist afetados e reavalia saúde/risco da conta (a fonte deixou de existir).
 */
export async function deleteEffortCascade(timeEntryId: string, userId?: string): Promise<CascadeResult> {
  const admin = getSupabaseAdminClient() as any
  const g = await gatherTimeEntryArtifacts(admin, timeEntryId)
  if (!g) {
    return { deleted: { timeEntry: 0, interactions: 0, wishlistSignals: 0, embeddings: 0, suggestedTasks: 0 }, itemsRecomputed: 0 }
  }

  // 1) Embeddings (RAG) — interação, time_entry e sinais de wishlist
  await deleteEmbeddings(admin, 'time_entry', [timeEntryId])
  await deleteEmbeddings(admin, 'interaction', g.interactionIds)
  await deleteEmbeddings(admin, 'wishlist_signal', g.signalIds)

  // 2) Sinais de wishlist
  if (g.signalIds.length > 0) {
    await admin.from('wishlist_signals').delete().in('id', g.signalIds)
  }

  // 3) Tarefas sugeridas em aberto (preserva iniciadas/concluídas — viram time_entry_id NULL)
  if (g.suggestedTaskIds.length > 0) {
    await admin.from('csm_tasks').delete().in('id', g.suggestedTaskIds)
  }

  // 4) O esforço (interações espelho caem por cascade da FK)
  await admin.from('time_entries').delete().eq('id', timeEntryId)

  // 5) Recalcula demanda dos itens de wishlist afetados (sinais que apontavam para um item)
  let itemsRecomputed = 0
  for (const itemId of g.affectedItemIds) {
    try { await recomputeItemDemand(itemId); itemsRecomputed++ } catch (e) { console.error('[effort-cascade] recomputeItemDemand error:', e) }
  }

  // 6) Reavalia saúde/risco da conta sem a fonte removida (best-effort)
  if (g.accountId) {
    try { await runAutomatedAccountAnalysis(g.accountId, userId, 'effort_delete') } catch (e) { console.error('[effort-cascade] reanalysis error:', e) }
  }

  return {
    deleted: {
      timeEntry: 1,
      interactions: g.interactionIds.length,
      wishlistSignals: g.signalIds.length,
      embeddings: g.embeddingCount,
      suggestedTasks: g.suggestedTaskIds.length,
    },
    itemsRecomputed,
  }
}

/**
 * Reavaliação após EDITAR um esforço (sem diálogo). Mantém os derivados coerentes:
 *  - Re-vetoriza o embedding da interação (conteúdo/data/tipo mudaram → RAG desatualiza).
 *  - Se a CONTA mudou, propaga `account_id` para os wishlist_signals deste esforço e
 *    os embeddings de wishlist (senão a demanda fica atribuída à conta errada).
 * Não re-extrai a wishlist: o texto-fonte (`natural_language_input`) não é editável
 * por esta rota, então os sinais já extraídos seguem válidos.
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

  // Conta mudou: realoca sinais de wishlist e seus embeddings para a nova conta
  if (oldAccountId && oldAccountId !== accountId) {
    const { data: sigs } = await admin
      .from('wishlist_signals')
      .select('id')
      .eq('source_type', 'time_entry')
      .eq('source_id', timeEntryId)
    const sigIds: string[] = (sigs ?? []).map((s: any) => s.id)
    if (sigIds.length > 0) {
      await admin.from('wishlist_signals').update({ account_id: accountId }).in('id', sigIds)
      await admin.from('embeddings').update({ account_id: accountId }).eq('source_type', 'wishlist_signal').in('source_id', sigIds)
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
 * esforço (`time_entry_id` preenchido), delega para a cascade do esforço, para
 * não deixar o time_entry "viúvo". Caso contrário, apaga a interação avulsa e
 * seus derivados (sinais de wishlist + embeddings).
 */
export async function deleteInteractionCascade(interactionId: string, userId?: string): Promise<CascadeResult> {
  const admin = getSupabaseAdminClient() as any
  const { data: interaction } = await admin
    .from('interactions')
    .select('id, account_id, time_entry_id')
    .eq('id', interactionId)
    .single()
  if (!interaction) {
    return { deleted: { timeEntry: 0, interactions: 0, wishlistSignals: 0, embeddings: 0, suggestedTasks: 0 }, itemsRecomputed: 0 }
  }

  // Espelho de esforço → cascade pelo time_entry
  if (interaction.time_entry_id) {
    return deleteEffortCascade(interaction.time_entry_id, userId)
  }

  // Interação avulsa: sinais de wishlist sourced nela + embeddings
  const { data: signals } = await admin
    .from('wishlist_signals')
    .select('id, item_id')
    .eq('source_type', 'interaction')
    .eq('source_id', interactionId)
  const signalIds: string[] = (signals ?? []).map((s: any) => s.id)
  const affectedItemIds = Array.from(new Set((signals ?? []).map((s: any) => s.item_id).filter(Boolean))) as string[]

  const embeddingCount = await countEmbeddings(admin, '', [interactionId], signalIds)

  await deleteEmbeddings(admin, 'interaction', [interactionId])
  await deleteEmbeddings(admin, 'wishlist_signal', signalIds)
  if (signalIds.length > 0) await admin.from('wishlist_signals').delete().in('id', signalIds)
  await admin.from('interactions').delete().eq('id', interactionId)

  let itemsRecomputed = 0
  for (const itemId of affectedItemIds) {
    try { await recomputeItemDemand(itemId); itemsRecomputed++ } catch (e) { console.error('[effort-cascade] recomputeItemDemand error:', e) }
  }
  if (interaction.account_id) {
    try { await runAutomatedAccountAnalysis(interaction.account_id, userId, 'interaction_delete') } catch (e) { console.error('[effort-cascade] reanalysis error:', e) }
  }

  return {
    deleted: { timeEntry: 0, interactions: 1, wishlistSignals: signalIds.length, embeddings: embeddingCount, suggestedTasks: 0 },
    itemsRecomputed,
  }
}
