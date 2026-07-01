'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { findSimilar, suggestCatalogMatch, type MatchResult } from '@/lib/wishlist/matching'
import { recomputeItemDemand } from '@/lib/wishlist/demand'
import { recomputeItemRice } from '@/lib/wishlist/rice'
import { buildProductBrief, handoffItem, saveWishlistSettings, getWishlistSettings } from '@/lib/wishlist/handoff'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import type {
  CatalogMatch, TriageOutcome, WishlistItemStatus, WishlistKind, WishlistPriority, WishlistSettings,
} from '@/lib/wishlist/types'

async function requireUser() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  return { supabase, user }
}

function db() {
  return getSupabaseAdminClient() as any
}

async function log(entry: { item_id?: string | null; signal_id?: string | null; actor_id: string; action: string; from_status?: string | null; to_status?: string | null; note?: string | null }) {
  await db().from('wishlist_curation_log').insert(entry)
}

/**
 * Fase 3 — LOOP DE RETORNO: ao entregar um item, notifica os CSMs das contas que pediram
 * (e o dono do item) para avisarem o cliente que o que ele pediu foi entregue. É o diferencial
 * de CS enterprise: fecha o ciclo de confiança. Best-effort (não bloqueia a mudança de status).
 */
async function notifyDelivered(itemId: string, actorId: string) {
  const d = db()
  const { data: item } = await d.from('wishlist_items').select('title, owner_id').eq('id', itemId).single()
  if (!item) return
  const { data: signals } = await d.from('wishlist_signals').select('account_id').eq('item_id', itemId)
  const accountIds = Array.from(new Set((signals ?? []).map((s: any) => s.account_id).filter(Boolean)))
  let accounts: any[] = []
  if (accountIds.length) {
    const { data } = await d.from('accounts').select('id, name, csm_owner_id').in('id', accountIds)
    accounts = data ?? []
  }
  const names = accounts.map((a) => a.name).filter(Boolean)
  const recipients = new Set<string>()
  if (item.owner_id) recipients.add(item.owner_id)
  for (const a of accounts) if (a.csm_owner_id) recipients.add(a.csm_owner_id)
  const msg = `Pedido entregue: "${item.title}". Avise ${names.length ? names.join(', ') : 'as contas solicitantes'} de que o que pediram foi entregue.`
  const rows = [...recipients].map((uid) => ({
    user_id: uid, type: 'wishlist_delivered', message: msg,
    metadata: { item_id: itemId, account_ids: accountIds }, read: false, created_at: new Date().toISOString(),
  }))
  if (rows.length) await d.from('notifications').insert(rows)
  await log({ item_id: itemId, actor_id: actorId, action: 'delivered_notified', to_status: 'delivered', note: names.join(', ') || null })
}

// ── Captura manual ───────────────────────────────────────────────────────────
export async function createSignalManual(input: {
  accountId: string
  verbatim: string
  summary?: string
  kind?: WishlistKind
  requesterName?: string
  requesterEmail?: string
}) {
  const { user } = await requireUser()
  const { data, error } = await db()
    .from('wishlist_signals')
    .insert({
      account_id: input.accountId,
      source_type: 'manual',
      verbatim: input.verbatim.trim(),
      summary: input.summary?.trim() || input.verbatim.trim().slice(0, 200),
      kind: input.kind ?? null,
      requester_name: input.requesterName ?? null,
      requester_email: input.requesterEmail ?? null,
      created_by: user.id,
      ai_extracted: false,
    })
    .select('id, verbatim, account_id')
    .single()
  if (error) throw new Error(error.message)
  // embeda para participar do dedup cross-customer
  await storeEmbeddings(data.account_id, 'wishlist_signal', data.id, data.verbatim).catch(() => {})
  revalidatePath('/wishlist')
  return data.id as string
}

// ── Insights de um sinal (sugestões de catálogo + itens/sinais semelhantes) ────
export interface SignalInsights {
  catalog: CatalogMatch | null
  matches: MatchResult
  catalogConfigured: boolean   // false = não há funcionalidades cadastradas (catálogo vazio)
}
export async function analyzeSignal(signalId: string): Promise<SignalInsights> {
  await requireUser()
  const { data: signal } = await db().from('wishlist_signals').select('id, verbatim').eq('id', signalId).single()
  if (!signal) throw new Error('Sinal não encontrado')
  const [catalog, matches, featureCount] = await Promise.all([
    suggestCatalogMatch(signal.verbatim),
    findSimilar(signal.verbatim, { excludeSignalId: signalId }),
    db().from('product_features').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])
  return { catalog, matches, catalogConfigured: (featureCount?.count ?? 0) > 0 }
}

// ── Triagem (desfechos sem promoção) ──────────────────────────────────────────
export async function triageResolvedExisting(signalId: string, matchedFeatureId: string | null, note: string | null) {
  const { user } = await requireUser()
  await db().from('wishlist_signals').update({
    triage_outcome: 'resolved_existing',
    matched_feature_id: matchedFeatureId,
    triage_note: note,
    triaged_by: user.id,
    triaged_at: new Date().toISOString(),
  }).eq('id', signalId)
  await log({ signal_id: signalId, actor_id: user.id, action: 'triage_resolved_existing', to_status: 'resolved_existing', note })
  revalidatePath('/wishlist')
}

export async function dismissSignal(signalId: string, note: string | null) {
  const { user } = await requireUser()
  await db().from('wishlist_signals').update({
    triage_outcome: 'dismissed', triage_note: note, triaged_by: user.id, triaged_at: new Date().toISOString(),
  }).eq('id', signalId)
  await log({ signal_id: signalId, actor_id: user.id, action: 'triage_dismissed', to_status: 'dismissed', note })
  revalidatePath('/wishlist')
}

// ── Promoção a item (novo ou vínculo) ─────────────────────────────────────────
function outcomeForKind(kind: WishlistKind): TriageOutcome {
  return kind === 'enhancement' ? 'insufficient_enhancement' : 'not_available_new'
}

export async function promoteToNewItem(signalId: string, input: { title: string; kind: WishlistKind; matchedFeatureId?: string | null }) {
  const { user } = await requireUser()
  const { data: signal } = await db().from('wishlist_signals').select('id, summary, verbatim').eq('id', signalId).single()
  if (!signal) throw new Error('Sinal não encontrado')

  const { data: item, error } = await db().from('wishlist_items').insert({
    title: input.title.trim() || signal.summary || signal.verbatim.slice(0, 120),
    problem: signal.summary ?? signal.verbatim,
    kind: input.kind,
    status: 'under_curation',
    matched_feature_id: input.matchedFeatureId ?? null,
    created_by: user.id,
    owner_id: user.id,
  }).select('id').single()
  if (error) throw new Error(error.message)

  await db().from('wishlist_signals').update({
    item_id: item.id,
    triage_outcome: outcomeForKind(input.kind),
    matched_feature_id: input.matchedFeatureId ?? null,
    triaged_by: user.id,
    triaged_at: new Date().toISOString(),
  }).eq('id', signalId)

  await recomputeItemDemand(item.id)
  await log({ item_id: item.id, signal_id: signalId, actor_id: user.id, action: 'promote_new_item', to_status: 'under_curation' })
  revalidatePath('/wishlist')
  return item.id as string
}

export async function promoteToExistingItem(signalId: string, itemId: string, kind: WishlistKind) {
  const { user } = await requireUser()
  await db().from('wishlist_signals').update({
    item_id: itemId,
    triage_outcome: outcomeForKind(kind),
    triaged_by: user.id,
    triaged_at: new Date().toISOString(),
  }).eq('id', signalId)
  await recomputeItemDemand(itemId)
  await log({ item_id: itemId, signal_id: signalId, actor_id: user.id, action: 'promote_link_item' })
  revalidatePath('/wishlist')
  revalidatePath(`/wishlist/${itemId}`)
}

// ── Triagem em LOTE por cluster (Fase 1 v2) ───────────────────────────────────
/** Promove um cluster inteiro (grupo de sinais semelhantes) a UM item, somando a demanda. */
export async function promoteClusterToItem(clusterKey: string, input: { title: string; kind: WishlistKind; matchedFeatureId?: string | null }) {
  const { user } = await requireUser()
  const { data: sigs } = await db()
    .from('wishlist_signals').select('id, summary, verbatim')
    .eq('cluster_key', clusterKey).eq('triage_outcome', 'pending')
  const signals = (sigs ?? []) as any[]
  if (signals.length === 0) throw new Error('Cluster sem sinais pendentes')
  const rep = signals[0]

  const { data: item, error } = await db().from('wishlist_items').insert({
    title: input.title.trim() || rep.summary || String(rep.verbatim).slice(0, 120),
    problem: rep.summary ?? rep.verbatim,
    kind: input.kind,
    status: 'under_curation',
    matched_feature_id: input.matchedFeatureId ?? null,
    created_by: user.id,
    owner_id: user.id,
  }).select('id').single()
  if (error) throw new Error(error.message)

  await db().from('wishlist_signals').update({
    item_id: item.id,
    triage_outcome: outcomeForKind(input.kind),
    matched_feature_id: input.matchedFeatureId ?? null,
    triaged_by: user.id,
    triaged_at: new Date().toISOString(),
  }).eq('cluster_key', clusterKey).eq('triage_outcome', 'pending')

  await recomputeItemDemand(item.id)
  await log({ item_id: item.id, actor_id: user.id, action: 'promote_cluster_item', to_status: 'under_curation', note: `${signals.length} sinal(is) do cluster` })
  revalidatePath('/wishlist')
  return item.id as string
}

/** Marca todo o cluster como "já existe" (liga à feature) — sem criar item. */
export async function resolveClusterExisting(clusterKey: string, matchedFeatureId: string | null, note: string | null) {
  const { user } = await requireUser()
  await db().from('wishlist_signals').update({
    triage_outcome: 'resolved_existing', matched_feature_id: matchedFeatureId,
    triage_note: note, triaged_by: user.id, triaged_at: new Date().toISOString(),
  }).eq('cluster_key', clusterKey).eq('triage_outcome', 'pending')
  await log({ actor_id: user.id, action: 'resolve_cluster_existing', to_status: 'resolved_existing', note })
  revalidatePath('/wishlist')
}

/** Descarta todo o cluster. */
export async function dismissCluster(clusterKey: string, note: string | null) {
  const { user } = await requireUser()
  await db().from('wishlist_signals').update({
    triage_outcome: 'dismissed', triage_note: note, triaged_by: user.id, triaged_at: new Date().toISOString(),
  }).eq('cluster_key', clusterKey).eq('triage_outcome', 'pending')
  await log({ actor_id: user.id, action: 'dismiss_cluster', to_status: 'dismissed', note })
  revalidatePath('/wishlist')
}

// ── Curadoria do item ─────────────────────────────────────────────────────────
export async function updateItem(itemId: string, patch: {
  title?: string; problem?: string; desired_outcome?: string; category?: string;
  kind?: WishlistKind; priority?: WishlistPriority | null; matched_feature_id?: string | null
}) {
  await requireUser()
  await db().from('wishlist_items').update(patch).eq('id', itemId)
  revalidatePath(`/wishlist/${itemId}`)
  revalidatePath('/wishlist')
}

export interface RiceFields {
  product_id?: string | null
  epic_id?: string | null
  activity_type?: string | null
  criticality?: string | null
  areas?: string[]
  reach_pct?: number | null
  impact_differentiation?: number | null
  impact_commercial_opportunity?: number | null
  impact_satisfaction?: number | null
  impact_churn_prevention?: number | null
  commercial_commitment?: boolean
  confidence_competitor_has?: boolean | null
  confidence_wishlist_clients?: boolean
  confidence_wishlist_leads?: boolean | null
}

export async function updateItemRice(itemId: string, fields: RiceFields) {
  await requireUser()
  await db().from('wishlist_items').update(fields).eq('id', itemId)
  // Recalcula o score com a PRIMITIVA ÚNICA (nunca diverge da listagem/backlog).
  await recomputeItemRice(itemId).catch(() => {})
  revalidatePath(`/wishlist/${itemId}`)
  revalidatePath('/wishlist')
}

export async function setItemStatus(itemId: string, status: WishlistItemStatus) {
  const { user } = await requireUser()
  const { data: cur } = await db().from('wishlist_items').select('status').eq('id', itemId).single()
  const patch: any = { status }
  if (status === 'accepted') patch.accepted_at = new Date().toISOString()
  await db().from('wishlist_items').update(patch).eq('id', itemId)
  await log({ item_id: itemId, actor_id: user.id, action: 'set_status', from_status: cur?.status, to_status: status })
  // Fase 3 — brief automático ao ACEITAR (best-effort; não bloqueia a mudança de status).
  if (status === 'accepted') { try { await buildProductBrief(itemId) } catch { /* gera depois no handoff */ } }
  // Fase 3 — loop de retorno: ao ENTREGAR, notifica os CSMs das contas solicitantes.
  if (status === 'delivered') { try { await notifyDelivered(itemId, user.id) } catch { /* best-effort */ } }
  revalidatePath(`/wishlist/${itemId}`)
  revalidatePath('/wishlist')
}

export async function unlinkSignal(signalId: string, itemId: string) {
  const { user } = await requireUser()
  await db().from('wishlist_signals').update({ item_id: null }).eq('id', signalId)
  await recomputeItemDemand(itemId)
  await log({ item_id: itemId, signal_id: signalId, actor_id: user.id, action: 'unlink_signal' })
  revalidatePath(`/wishlist/${itemId}`)
}

// ── Handoff ────────────────────────────────────────────────────────────────────
export async function buildBriefAction(itemId: string) {
  await requireUser()
  const brief = await buildProductBrief(itemId)
  revalidatePath(`/wishlist/${itemId}`)
  return brief
}

export async function handoffAction(itemId: string, mode: 'export' | 'webhook') {
  const { user } = await requireUser()
  const result = await handoffItem(itemId, { mode, userId: user.id })
  await log({ item_id: itemId, actor_id: user.id, action: `handoff_${mode}`, to_status: result.ok ? 'handed_off' : undefined, note: result.error ?? null })
  revalidatePath(`/wishlist/${itemId}`)
  revalidatePath('/wishlist')
  return result
}

export async function getSettingsAction(): Promise<WishlistSettings> {
  await requireUser()
  return getWishlistSettings()
}

export async function saveSettingsAction(settings: WishlistSettings) {
  const { user } = await requireUser()
  await saveWishlistSettings(settings, user.id)
  revalidatePath('/wishlist')
}
