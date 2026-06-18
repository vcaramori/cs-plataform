import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { meetingDateISO, durationHours, normalizeApiTranscript, extractActionItems, type ReadAiMeeting } from './client'

/**
 * Ingestão de UMA reunião do Read.ai (espelha persistHistoricalEffort):
 *   - time_entry (esforço, horas = duração da reunião)
 *   - interaction (transcrição completa na timeline da conta)  ← dedup por external_meeting_id
 *   - embeddings (RAG)
 *   - csm_tasks a partir dos action items (só na 1ª ingestão; sem duplicar em re-sync)
 *
 * Idempotente: re-sync atualiza a mesma interaction/time_entry (não duplica). `csm_id` é
 * o CSM dono da conexão Read.ai (dono das reuniões) — interactions.csm_id é NOT NULL.
 */

export type IngestResult = 'created' | 'updated' | 'skipped'

interface ExistingInteraction { id: string; time_entry_id: string | null }

export async function ingestReadAiMeeting(
  m: ReadAiMeeting,
  accountId: string,
  userId: string
): Promise<IngestResult> {
  if (!m.id) return 'skipped'
  const admin = getSupabaseAdminClient() as any

  const date = meetingDateISO(m.start_time_ms)
  const hours = durationHours(m)
  const transcript = normalizeApiTranscript(m)
  const summary = (m.summary ?? null) as string | null
  const title = (m.title ?? 'Reunião').toString().slice(0, 255)
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

  // Já existe? (dedup por external_meeting_id)
  const { data: existing } = await admin
    .from('interactions')
    .select('id, time_entry_id')
    .eq('external_meeting_id', m.id)
    .maybeSingle()
  const prior = (existing ?? null) as ExistingInteraction | null

  let interactionId: string
  let timeEntryId: string | null = prior?.time_entry_id ?? null

  if (prior) {
    // --- UPDATE: não sobrescreve transcrição/summary boas por vazias ---
    interactionId = prior.id
    const intPatch: Record<string, unknown> = { title, date, direct_hours: hours, sentiment_score: sentiment, meta }
    if (transcript) intPatch.raw_transcript = transcript
    if (summary) intPatch.summary = summary
    await admin.from('interactions').update(intPatch).eq('id', interactionId)

    if (timeEntryId) {
      const tePatch: Record<string, unknown> = { parsed_hours: hours, date }
      if (summary) tePatch.parsed_description = summary
      if (transcript) tePatch.natural_language_input = transcript
      await admin.from('time_entries').update(tePatch).eq('id', timeEntryId)
    }
  } else {
    // --- CREATE: time_entry (esforço) + interaction (transcrição) linkados ---
    const { data: te, error: teErr } = await admin
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
    timeEntryId = te.id

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
    interactionId = intRow.id

    // Backref time_entry → interaction
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
  }

  // RAG (best-effort) — re-embeda quando há texto.
  if (transcript || summary) {
    const chunk = `Reunião | ${accountName} | ${date} | ${title}\nResumo: ${summary ?? '—'}\n\nTranscrição:\n${transcript ?? '—'}`
    try { await storeEmbeddings(accountId, 'interaction', interactionId, chunk) }
    catch (e) { console.error('[readai] embed error:', e instanceof Error ? e.message : e) }
  }

  return prior ? 'updated' : 'created'
}
