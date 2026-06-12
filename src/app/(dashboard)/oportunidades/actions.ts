'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { findSimilar, suggestPlanMatch, type MatchResult } from '@/lib/opportunities/matching'
import { recomputeItemDemand } from '@/lib/opportunities/sizing'
import { buildCommercialBrief, markAsSent } from '@/lib/opportunities/brief'
import type {
  OpportunityType, OpportunityItemStatus, OpportunityPriority, PlanMatch,
} from '@/lib/opportunities/types'

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
  await db().from('opportunity_curation_log').insert(entry)
}

// ── Captura manual ───────────────────────────────────────────────────────────
export async function createSignalManual(input: {
  accountId: string
  verbatim: string
  summary?: string
  opportunity_type?: OpportunityType
  requesterName?: string
  requesterEmail?: string
}) {
  const { user } = await requireUser()
  const { data, error } = await db()
    .from('opportunity_signals')
    .insert({
      account_id: input.accountId,
      source_type: 'manual',
      verbatim: input.verbatim.trim(),
      summary: input.summary?.trim() || input.verbatim.trim().slice(0, 200),
      opportunity_type: input.opportunity_type ?? 'other',
      requester_name: input.requesterName ?? null,
      requester_email: input.requesterEmail ?? null,
      created_by: user.id,
      ai_extracted: false,
    })
    .select('id, verbatim, account_id')
    .single()
  if (error) throw new Error(error.message)
  await storeEmbeddings(data.account_id, 'opportunity_signal', data.id, data.verbatim).catch(() => {})
  revalidatePath('/oportunidades')
  return data.id as string
}

// ── Insights de um sinal (sugestão de plano/feature + semelhantes cross-customer) ──
export interface SignalInsights {
  planMatch: PlanMatch | null
  matches: MatchResult
  catalogConfigured: boolean   // false = não há planos/funcionalidades cadastrados
}
export async function analyzeSignal(signalId: string): Promise<SignalInsights> {
  await requireUser()
  const { data: signal } = await db().from('opportunity_signals').select('id, verbatim').eq('id', signalId).single()
  if (!signal) throw new Error('Sinal não encontrado')
  const [planMatch, matches, featureCount] = await Promise.all([
    suggestPlanMatch(signal.verbatim),
    findSimilar(signal.verbatim, { excludeSignalId: signalId }),
    db().from('product_features').select('id', { count: 'exact', head: true }).eq('is_active', true),
  ])
  return { planMatch, matches, catalogConfigured: (featureCount?.count ?? 0) > 0 }
}

// ── Triagem ────────────────────────────────────────────────────────────────────
export async function triageAlreadyAvailable(signalId: string, input: { matchedPlanId?: string | null; matchedFeatureId?: string | null; note?: string | null }) {
  const { user } = await requireUser()
  await db().from('opportunity_signals').update({
    triage_outcome: 'already_available',
    matched_plan_id: input.matchedPlanId ?? null,
    matched_feature_id: input.matchedFeatureId ?? null,
    triage_note: input.note ?? null,
    triaged_by: user.id,
    triaged_at: new Date().toISOString(),
  }).eq('id', signalId)
  await log({ signal_id: signalId, actor_id: user.id, action: 'triage_already_available', to_status: 'already_available', note: input.note ?? null })
  revalidatePath('/oportunidades')
}

export async function dismissSignal(signalId: string, note: string | null) {
  const { user } = await requireUser()
  await db().from('opportunity_signals').update({
    triage_outcome: 'dismissed', triage_note: note, triaged_by: user.id, triaged_at: new Date().toISOString(),
  }).eq('id', signalId)
  await log({ signal_id: signalId, actor_id: user.id, action: 'triage_dismissed', to_status: 'dismissed', note })
  revalidatePath('/oportunidades')
}

export async function markDuplicate(signalId: string, note: string | null) {
  const { user } = await requireUser()
  await db().from('opportunity_signals').update({
    triage_outcome: 'duplicate', triage_note: note, triaged_by: user.id, triaged_at: new Date().toISOString(),
  }).eq('id', signalId)
  await log({ signal_id: signalId, actor_id: user.id, action: 'triage_duplicate', to_status: 'duplicate', note })
  revalidatePath('/oportunidades')
}

// ── Promoção a item (novo ou vínculo) ─────────────────────────────────────────
export async function promoteToNewItem(signalId: string, input: { title: string; opportunity_type: OpportunityType; estimatedValue?: number | null }) {
  const { user } = await requireUser()
  const { data: signal } = await db().from('opportunity_signals').select('id, summary, verbatim').eq('id', signalId).single()
  if (!signal) throw new Error('Sinal não encontrado')

  const { data: item, error } = await db().from('opportunity_items').insert({
    title: input.title.trim() || signal.summary || signal.verbatim.slice(0, 120),
    need: signal.summary ?? signal.verbatim,
    opportunity_type: input.opportunity_type,
    status: 'under_curation',
    estimated_value: input.estimatedValue ?? null,
    created_by: user.id,
    owner_id: user.id,
  }).select('id').single()
  if (error) throw new Error(error.message)

  await db().from('opportunity_signals').update({
    item_id: item.id,
    triage_outcome: 'promoted',
    triaged_by: user.id,
    triaged_at: new Date().toISOString(),
  }).eq('id', signalId)

  await recomputeItemDemand(item.id)
  await log({ item_id: item.id, signal_id: signalId, actor_id: user.id, action: 'promote_new_item', to_status: 'under_curation' })
  revalidatePath('/oportunidades')
  return item.id as string
}

export async function promoteToExistingItem(signalId: string, itemId: string) {
  const { user } = await requireUser()
  await db().from('opportunity_signals').update({
    item_id: itemId,
    triage_outcome: 'promoted',
    triaged_by: user.id,
    triaged_at: new Date().toISOString(),
  }).eq('id', signalId)
  await recomputeItemDemand(itemId)
  await log({ item_id: itemId, signal_id: signalId, actor_id: user.id, action: 'promote_link_item' })
  revalidatePath('/oportunidades')
  revalidatePath(`/oportunidades/${itemId}`)
}

// ── Curadoria do item ─────────────────────────────────────────────────────────
export async function updateItem(itemId: string, patch: {
  title?: string; need?: string; desired_outcome?: string; category?: string;
  opportunity_type?: OpportunityType; priority?: OpportunityPriority | null; estimated_value?: number | null
}) {
  await requireUser()
  await db().from('opportunity_items').update({ ...patch, updated_at: new Date().toISOString() }).eq('id', itemId)
  revalidatePath(`/oportunidades/${itemId}`)
  revalidatePath('/oportunidades')
}

export async function setItemStatus(itemId: string, status: OpportunityItemStatus) {
  const { user } = await requireUser()
  const { data: cur } = await db().from('opportunity_items').select('status').eq('id', itemId).single()
  await db().from('opportunity_items').update({ status, updated_at: new Date().toISOString() }).eq('id', itemId)
  await log({ item_id: itemId, actor_id: user.id, action: 'set_status', from_status: cur?.status, to_status: status })
  revalidatePath(`/oportunidades/${itemId}`)
  revalidatePath('/oportunidades')
}

export async function unlinkSignal(signalId: string, itemId: string) {
  const { user } = await requireUser()
  await db().from('opportunity_signals').update({ item_id: null }).eq('id', signalId)
  await recomputeItemDemand(itemId)
  await log({ item_id: itemId, signal_id: signalId, actor_id: user.id, action: 'unlink_signal' })
  revalidatePath(`/oportunidades/${itemId}`)
}

// ── Brief + envio (manual) ──────────────────────────────────────────────────────
export async function buildBriefAction(itemId: string) {
  await requireUser()
  const brief = await buildCommercialBrief(itemId)
  revalidatePath(`/oportunidades/${itemId}`)
  return brief
}

export async function markAsSentAction(itemId: string) {
  const { user } = await requireUser()
  const result = await markAsSent(itemId, user.id)
  await log({ item_id: itemId, actor_id: user.id, action: 'marked_sent_pipedrive', to_status: 'sent' })
  revalidatePath(`/oportunidades/${itemId}`)
  revalidatePath('/oportunidades')
  return result
}
