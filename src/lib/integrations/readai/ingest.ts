import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { meetingDateISO, durationHours, normalizeApiTranscript, extractActionItems, type ReadAiMeeting } from './client'

/**
 * Ingestão de UMA reunião do Read.ai:
 *   - time_entry (esforço, horas = duração da reunião)
 *   - interaction (transcrição completa na timeline da conta)  ← dedup por external_meeting_id
 *   - embeddings (RAG)
 *   - csm_tasks a partir dos action items (só na 1ª criação)
 *
 * Idempotente: re-sync atualiza a mesma interaction/time_entry (não duplica).
 *
 * ANTI-DUPLICAÇÃO (merge): se já existe um esforço de reunião lançado MANUALMENTE no mesmo
 * dia/conta (sem external_meeting_id), a reunião NÃO cria um esforço novo — ela ENRIQUECE o
 * existente (transcrição/resumo/participantes + vincula o external_meeting_id), PRESERVANDO
 * as horas lançadas à mão. Se houver vários candidatos no mesmo dia, não adivinha: cria e
 * marca 'possible_duplicate' para revisão.
 */

export type IngestAction = 'created' | 'updated' | 'merged' | 'skipped' | 'possible_duplicate'

export interface IngestOutcome {
  action: IngestAction
  detail?: string
  accountId: string
  title: string
  externalMeetingId: string
}

interface ExistingInteraction { id: string; time_entry_id: string | null }

export async function ingestReadAiMeeting(
  m: ReadAiMeeting,
  accountId: string,
  userId: string
): Promise<IngestOutcome> {
  const externalMeetingId = (m.id ?? '').toString()
  const title = (m.title ?? 'Reunião').toString().slice(0, 255)
  if (!m.id) return { action: 'skipped', detail: 'reunião sem id', accountId, title, externalMeetingId }

  const admin = getSupabaseAdminClient() as any

  const date = meetingDateISO(m.start_time_ms)
  const hours = durationHours(m)
  const transcript = normalizeApiTranscript(m)
  const summary = (m.summary ?? null) as string | null
  const sentiment = typeof m.metrics?.sentiment === 'number' ? m.metrics!.sentiment! : null
  const meta = {
    participants: m.participants ?? [],
    owner: m.owner ?? null,
    action_items: m.action_items ?? null,
    topics: m.topics ?? null,
    report_url: m.report_url ?? null,
    platform: m.platform ?? null,
  }

  // Conta (para o chunk do RAG).
  const { data: acc } = await admin.from('accounts').select('name').eq('id', accountId).maybeSingle()
  const accountName = acc?.name ?? 'Conta'

  // Re-vetoriza (best-effort) quando há texto.
  const embed = async (interactionId: string) => {
    if (!transcript && !summary) return
    const chunk = `Reunião | ${accountName} | ${date} | ${title}\nResumo: ${summary ?? '—'}\n\nTranscrição:\n${transcript ?? '—'}`
    try { await storeEmbeddings(accountId, 'interaction', interactionId, chunk) }
    catch (e) { console.error('[readai] embed error:', e instanceof Error ? e.message : e) }
  }

  // ---------------------------------------------------------------------------
  // 1) Já existe esta reunião (dedup por external_meeting_id) → UPDATE idempotente.
  // ---------------------------------------------------------------------------
  const { data: existing } = await admin
    .from('interactions')
    .select('id, time_entry_id')
    .eq('external_meeting_id', m.id)
    .maybeSingle()
  const prior = (existing ?? null) as ExistingInteraction | null

  if (prior) {
    const intPatch: Record<string, unknown> = { title, date, direct_hours: hours, sentiment_score: sentiment, meta }
    if (transcript) intPatch.raw_transcript = transcript
    if (summary) intPatch.summary = summary
    await admin.from('interactions').update(intPatch).eq('id', prior.id)
    if (prior.time_entry_id) {
      const tePatch: Record<string, unknown> = { parsed_hours: hours, date }
      if (summary) tePatch.parsed_description = summary
      if (transcript) tePatch.natural_language_input = transcript
      await admin.from('time_entries').update(tePatch).eq('id', prior.time_entry_id)
    }
    await embed(prior.id)
    return { action: 'updated', accountId, title, externalMeetingId }
  }

  // ---------------------------------------------------------------------------
  // 2) Esforço de reunião lançado MANUALMENTE no mesmo dia/conta (sem vínculo)?
  // ---------------------------------------------------------------------------
  const { data: candData } = await admin
    .from('interactions')
    .select('id, time_entry_id, summary, raw_transcript, sentiment_score')
    .eq('account_id', accountId)
    .eq('date', date)
    .eq('type', 'meeting')
    .is('external_meeting_id', null)
    .not('time_entry_id', 'is', null)
  const candidates = (candData ?? []) as Array<{
    id: string; time_entry_id: string; summary: string | null; raw_transcript: string | null; sentiment_score: number | null
  }>

  if (candidates.length === 1) {
    // --- MERGE: enriquece o esforço manual, preserva horas/título/data ---
    const c = candidates[0]
    const intPatch: Record<string, unknown> = { external_meeting_id: m.id, meta }
    if (transcript) intPatch.raw_transcript = transcript
    if (summary) intPatch.summary = summary
    if (c.sentiment_score == null && sentiment != null) intPatch.sentiment_score = sentiment
    await admin.from('interactions').update(intPatch).eq('id', c.id)

    // time_entry: só preenche campos vazios; NUNCA mexe em parsed_hours/date (esforço manual).
    const { data: te } = await admin
      .from('time_entries')
      .select('parsed_description, natural_language_input')
      .eq('id', c.time_entry_id)
      .maybeSingle()
    const tePatch: Record<string, unknown> = {}
    if (summary && !te?.parsed_description) tePatch.parsed_description = summary
    if (transcript && !te?.natural_language_input) tePatch.natural_language_input = transcript
    if (Object.keys(tePatch).length) await admin.from('time_entries').update(tePatch).eq('id', c.time_entry_id)

    await embed(c.id)
    return { action: 'merged', detail: `mesclado com esforço manual (time_entry ${c.time_entry_id})`, accountId, title, externalMeetingId }
  }

  const possibleDuplicate = candidates.length > 1

  // ---------------------------------------------------------------------------
  // 3) CREATE: novo time_entry (esforço) + interaction (transcrição) linkados.
  // ---------------------------------------------------------------------------
  const { data: teRow, error: teErr } = await admin
    .from('time_entries')
    .insert({
      account_id: accountId,
      csm_id: userId,
      activity_type: 'meeting',
      natural_language_input: transcript ?? summary ?? title,
      parsed_hours: hours,
      parsed_description: summary ?? title,
      date,
    })
    .select('id')
    .single()
  if (teErr) throw new Error(teErr.message)
  const timeEntryId = teRow.id

  const { data: intRow, error: intErr } = await admin
    .from('interactions')
    .insert({
      account_id: accountId,
      csm_id: userId,
      type: 'meeting',
      source: 'readai',
      date,
      direct_hours: hours,
      title,
      summary,
      raw_transcript: transcript,
      sentiment_score: sentiment,
      external_meeting_id: m.id,
      time_entry_id: timeEntryId,
      meta,
    })
    .select('id')
    .single()
  if (intErr) throw new Error(intErr.message)
  const interactionId = intRow.id

  await admin.from('time_entries').update({ interaction_id: interactionId }).eq('id', timeEntryId)

  // Tarefas dos action items (só na criação → não duplica em re-sync)
  const actions = extractActionItems(m)
  if (actions.length > 0) {
    const inserts = actions.map((a) => ({
      csm_id: userId,
      account_id: accountId,
      title: a.title,
      description: a.description ? `${a.description}\n\n— Origem: reunião Read.ai de ${date}` : `Sugerida a partir da reunião Read.ai de ${date}.`,
      status: 'todo',
      priority: 'medium',
      time_entry_id: timeEntryId,
      source_label: 'time_entry',
    }))
    const { error: tErr } = await admin.from('csm_tasks').insert(inserts)
    if (tErr) console.error('[readai] task insert error:', tErr.message)
  }

  await embed(interactionId)

  return possibleDuplicate
    ? { action: 'possible_duplicate', detail: `${candidates.length} esforços de reunião no mesmo dia/conta — importado à parte; revise para mesclar`, accountId, title, externalMeetingId }
    : { action: 'created', accountId, title, externalMeetingId }
}
