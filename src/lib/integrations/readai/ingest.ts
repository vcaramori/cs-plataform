import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { extractSignals } from '@/lib/signals/extract-signals'
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

interface ExistingInteraction { id: string; time_entry_id: string | null; raw_transcript: string | null; summary: string | null }

async function attemptExtractSignals(interactionId: string, accountId: string, userId: string, transcript?: string | null) {
  if (!transcript || transcript.trim().length < 50) return
  try {
    await extractSignals({
      text: transcript,
      accountId,
      sourceType: 'interaction',
      sourceId: interactionId,
      createdBy: userId,
    })
  } catch (e) {
    console.error('[readai] Falha ao extrair sinais (wishlist/opps):', e)
  }
}

export async function ingestReadAiMeeting(
  m: ReadAiMeeting,
  accountId: string,
  userId: string,
  opts: { extractSignals?: boolean } = {}
): Promise<IngestOutcome> {
  // Extração de sinais por IA roda um LLM sobre a transcrição inteira (~100s numa de 57KB):
  // pesado demais p/ rodar SÍNCRONO no backfill em massa (estoura o tempo da função e segura
  // conexões). Liga só na ingestão em tempo real (webhook). Default: ligado.
  const runSignals = opts.extractSignals !== false
  const externalMeetingId = (m.id ?? '').toString()
  const title = (m.title ?? 'Reunião').toString().slice(0, 255)
  if (!m.id) return { action: 'skipped', detail: 'reunião sem id', accountId, title, externalMeetingId }

  const admin = getSupabaseAdminClient() as any

  const date = meetingDateISO(m.start_time_ms)
  const hours = durationHours(m)
  const transcript = normalizeApiTranscript(m)
  const summary = (m.summary ?? null) as string | null
  const rawSentiment = typeof m.metrics?.sentiment === 'number' ? m.metrics!.sentiment! : null
  // sentiment_score tem CHECK de faixa (−1..1) além de numeric(4,3). Fora da faixa válida →
  // NULL (não arrisca violar o CHECK nem estourar). Dentro → arredonda a 3 casas.
  const sentiment = rawSentiment != null && rawSentiment >= -1 && rawSentiment <= 1
    ? Math.round(rawSentiment * 1000) / 1000
    : null
  const meta = {
    participants: m.participants ?? [],
    owner: m.owner ?? null,
    action_items: m.action_items ?? null,
    topics: m.topics ?? null,
    report_url: m.report_url ?? null,
    platform: m.platform ?? null,
    // Métricas do Read.ai (read_score/engagement/sentiment etc.) — antes só o sentiment
    // era persistido; agora guardamos o bloco inteiro para análise futura. jsonb, sem migração.
    metrics: m.metrics ?? null,
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
    .select('id, time_entry_id, raw_transcript, summary')
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
    // Re-vetoriza só quando o conteúdo de fato mudou (transcrição/resumo novos ou alterados).
    // Evita re-embeddar todo o histórico a cada ciclo — crucial no backfill (não estoura o maxDuration).
    const contentChanged =
      (!!transcript && transcript !== prior.raw_transcript) ||
      (!!summary && summary !== prior.summary)
    if (contentChanged) {
      await embed(prior.id)
      if (runSignals && transcript && transcript !== prior.raw_transcript) {
        await attemptExtractSignals(prior.id, accountId, userId, transcript)
      }
    }
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
    if (runSignals && transcript && transcript !== c.raw_transcript) {
      await attemptExtractSignals(c.id, accountId, userId, transcript)
    }
    return { action: 'merged', detail: `mesclado com esforço manual (time_entry ${c.time_entry_id})`, accountId, title, externalMeetingId }
  }

  const possibleDuplicate = candidates.length > 1

  // ---------------------------------------------------------------------------
  // 3) CREATE: novo time_entry (esforço) + interaction (transcrição) linkados.
  // ---------------------------------------------------------------------------
  
  // Verifica se o usuário tem a flag de esforço de onboarding por padrão
  const { data: profile } = await admin.from('profiles').select('default_onboarding_effort').eq('id', userId).single()
  const isOnboardingEffort = profile?.default_onboarding_effort ?? false

  let onboardingContractId: string | null = null
  if (isOnboardingEffort) {
    const { data: contract } = await admin
      .from('contracts')
      .select('id')
      .eq('account_id', accountId)
      .eq('onboarding_status', 'in-progress')
      .order('onboarding_started_at', { ascending: true })
      .limit(1)
      .single()
    if (contract) {
      onboardingContractId = contract.id
    }
  }

  const { data: teRow, error: teErr } = await admin
    .from('time_entries')
    .insert({
      account_id: accountId,
      csm_id: userId,
      activity_type: onboardingContractId ? 'onboarding' : 'meeting',
      natural_language_input: transcript ?? summary ?? title,
      parsed_hours: hours,
      parsed_description: summary ?? title,
      date,
      ...(onboardingContractId && { psa_sync_status: 'pending' }),
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
      type: onboardingContractId ? 'onboarding' : 'meeting',
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

  if (onboardingContractId) {
    try {
      const { recordOnboardingEffort } = await import('@/lib/effort/log-effort')
      const authUser = await admin.auth.admin.getUserById(userId)
      const userEmail = authUser.data?.user?.email ?? 'sem-email@plannera.com.br'
      
      await recordOnboardingEffort({
        timeEntryId,
        contractId: onboardingContractId,
        accountId,
        accountName,
        userId,
        userEmail,
        hours,
        date,
        description: summary ?? title,
      })
    } catch (e) {
      console.error('[readai] Falha ao registrar esforço de onboarding:', e)
    }
  }

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
  if (runSignals && transcript) {
    await attemptExtractSignals(interactionId, accountId, userId, transcript)
  }

  return possibleDuplicate
    ? { action: 'possible_duplicate', detail: `${candidates.length} esforços de reunião no mesmo dia/conta — importado à parte; revise para mesclar`, accountId, title, externalMeetingId }
    : { action: 'created', accountId, title, externalMeetingId }
}
