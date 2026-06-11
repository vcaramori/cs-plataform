import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { parseTimeEntry } from '@/lib/gemini/parse-time-entry'
import { ingestOnboardingEvent } from '@/lib/rag/rag-pipeline'
import { postEffortToPSA } from '@/lib/integrations/psa'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import type { HistoricalEntry } from '@/lib/gemini/parse-historical-efforts'

/**
 * Lógica de esforço compartilhada entre a rota /api/time-entries e o MCP.
 * `recordOnboardingEffort` é a parte crítica (diário + RAG + PSA) reusada pelos dois,
 * para manter UM caminho só de integração.
 */

export type OnboardingEffortSync = {
  timeEntryId: string
  contractId: string
  accountId: string
  accountName: string
  userId: string
  userEmail: string
  hours: number
  date: string
  description: string
}

/**
 * Cria o evento de esforço no diário de onboarding (entra na trilha RAG) e
 * aponta as horas no PSA, gravando o status no time_entry. Best-effort.
 */
export async function recordOnboardingEffort(input: OnboardingEffortSync): Promise<{ status: string; message: string }> {
  const admin = getSupabaseAdminClient() as any

  // Diário de onboarding + RAG (best-effort)
  try {
    const { data: ev } = await admin
      .from('onboarding_events')
      .insert({
        contract_id: input.contractId,
        account_id: input.accountId,
        time_entry_id: input.timeEntryId,
        event_type: 'effort',
        title: `Esforço de implantação: ${input.hours}h`,
        description: input.description,
        date: input.date,
        created_by: input.userId,
      })
      .select('id')
      .single()
    if (ev?.id) { try { await ingestOnboardingEvent(ev.id) } catch { /* RAG best-effort */ } }
  } catch (evErr) {
    console.error('[logEffort] onboarding_event insert error:', evErr)
  }

  // Apontamento no PSA
  const psa = await postEffortToPSA({
    userEmail: input.userEmail,
    projectName: input.accountName,
    hours: input.hours,
    date: input.date,
    notes: input.description,
  })
  const syncStatus = psa.status === 'success' ? 'synced' : psa.status === 'skipped' ? 'skipped' : 'failed'
  try {
    await admin
      .from('time_entries')
      .update({
        psa_sync_status: syncStatus,
        psa_synced_at: syncStatus === 'synced' ? new Date().toISOString() : null,
        psa_message: psa.message,
      })
      .eq('id', input.timeEntryId)
  } catch (upErr) {
    console.error('[logEffort] PSA status update error:', upErr)
  }

  return { status: psa.status, message: psa.message }
}

export class LogEffortError extends Error {
  code: 'PARSE_FAILED' | 'ACCOUNT_NOT_FOUND'
  constructor(code: 'PARSE_FAILED' | 'ACCOUNT_NOT_FOUND', message: string) {
    super(message)
    this.code = code
  }
}

const normalize = (str: string) =>
  str.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, '').trim()

/**
 * Fluxo completo de esforço para uso fora da rota (ex.: MCP): parse IA →
 * resolução de conta → insert do time_entry → (se onboarding) diário/RAG/PSA.
 * Usa o admin client (sem sessão de usuário). Lança LogEffortError em falhas previsíveis.
 */
export async function logEffort(params: {
  userId: string
  userEmail: string
  rawText: string
  accountId?: string | null
  onboardingContractId?: string | null
}): Promise<{ timeEntry: any; parsed: any; psa: { status: string; message: string } | null }> {
  const admin = getSupabaseAdminClient() as any
  const today = new Date().toISOString().slice(0, 10)

  let parsed
  try {
    parsed = await parseTimeEntry(params.rawText, today)
  } catch (err) {
    throw new LogEffortError('PARSE_FAILED', 'Falha ao processar o texto do esforço com IA.')
  }

  // Resolve conta: por id explícito ou por nome detectado
  let accountId = params.accountId ?? null
  if (!accountId && parsed.account_name_hint) {
    const hint = normalize(parsed.account_name_hint)
    const { data: accounts } = await admin.from('accounts').select('id, name, company_name')
    const match = (accounts ?? []).find((a: any) => {
      const n = normalize(a.name)
      const c = a.company_name ? normalize(a.company_name) : ''
      return n === hint || c === hint || hint.includes(n) || n.includes(hint) || (c && (hint.includes(c) || c.includes(hint)))
    })
    if (match) accountId = match.id
  }
  if (!accountId) {
    throw new LogEffortError('ACCOUNT_NOT_FOUND', 'Conta não identificada — informe o nome exato ou o account_id.')
  }

  const isOnboarding = !!params.onboardingContractId
  const { data: timeEntry, error } = await admin
    .from('time_entries')
    .insert({
      account_id: accountId,
      csm_id: params.userId,
      activity_type: isOnboarding ? 'onboarding' : parsed.activity_type,
      natural_language_input: params.rawText,
      parsed_hours: parsed.parsed_hours,
      parsed_description: parsed.parsed_description,
      date: parsed.date,
      ...(isOnboarding && { psa_sync_status: 'pending' }),
    })
    .select('*, accounts(name)')
    .single()
  if (error) throw new Error(error.message)

  let psa: { status: string; message: string } | null = null
  if (isOnboarding) {
    psa = await recordOnboardingEffort({
      timeEntryId: timeEntry.id,
      contractId: params.onboardingContractId!,
      accountId,
      accountName: timeEntry.accounts?.name ?? 'Conta',
      userId: params.userId,
      userEmail: params.userEmail,
      hours: parsed.parsed_hours,
      date: parsed.date,
      description: parsed.parsed_description,
    })
  }

  return { timeEntry, parsed, psa }
}

/**
 * Carga histórica: persiste UMA entrada já parseada (de parseHistoricalEfforts)
 * com a DATA real do evento. Cria time_entry + interaction + vetoriza no RAG
 * (data embutida no chunk). Cria tarefas só se `createTasks` e a entrada não pedir
 * para pular (`skip_tasks`). Não dispara análise de IA por entrada (lote).
 */
export async function persistHistoricalEffort(params: {
  userId: string
  accountId: string
  entry: HistoricalEntry
  createTasks: boolean
}): Promise<{ timeEntryId: string; tasksCreated: number }> {
  const admin = getSupabaseAdminClient() as any
  const { entry, accountId, userId } = params

  const { data: te, error } = await admin
    .from('time_entries')
    .insert({
      account_id: accountId,
      csm_id: userId,
      activity_type: entry.activity_type,
      natural_language_input: entry.raw_text,
      parsed_hours: entry.parsed_hours,
      parsed_description: entry.parsed_description,
      date: entry.date,
    })
    .select('*, accounts(name)')
    .single()
  if (error) throw new Error(error.message)

  // Interação + RAG com a data do evento embutida (contexto temporal correto)
  const accountName = te.accounts?.name ?? 'Conta'
  const interactionType = ['meeting', 'onboarding', 'qbr'].includes(entry.activity_type) ? entry.activity_type : 'meeting'
  try {
    const { data: intRow } = await admin
      .from('interactions')
      .insert({
        account_id: accountId,
        csm_id: userId,
        title: `Reunião (histórico): ${(entry.parsed_description || 'Esforço').slice(0, 60)}`,
        type: interactionType,
        date: entry.date,
        direct_hours: entry.parsed_hours,
        source: 'effort_sync',
        time_entry_id: te.id,
        raw_transcript: entry.raw_text,
        sentiment_score: 0.2,
      })
      .select('id')
      .single()
    if (intRow?.id) {
      const chunk = `Interação | ${accountName} | ${entry.date} | Tipo: ${interactionType}\n${entry.raw_text}`
      try { await storeEmbeddings(accountId, 'interaction', intRow.id, chunk) } catch (e) { console.error('[historical] embed error:', e) }
    }
  } catch (intErr) {
    console.error('[historical] interaction insert error:', intErr)
  }

  // Tarefas (condicional): respeita createTasks global e skip_tasks por entrada
  let tasksCreated = 0
  if (params.createTasks && !entry.skip_tasks && entry.action_items.length > 0) {
    const inserts = entry.action_items.map((it) => ({
      csm_id: userId,
      account_id: accountId,
      title: it.title,
      status: 'todo',
      priority: 'medium',
      due_date: it.due_date ?? null,
      time_entry_id: te.id,
      source_label: 'time_entry',
    }))
    const { error: tErr } = await admin.from('csm_tasks').insert(inserts)
    if (tErr) console.error('[historical] task insert error:', tErr)
    else tasksCreated = inserts.length
  }

  return { timeEntryId: te.id, tasksCreated }
}
