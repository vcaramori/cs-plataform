import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { parseTimeEntry } from '@/lib/gemini/parse-time-entry'
import { ingestOnboardingEvent } from '@/lib/rag/rag-pipeline'
import { postEffortToPSA } from '@/lib/integrations/psa'

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
