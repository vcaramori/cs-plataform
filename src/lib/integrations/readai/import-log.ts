import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Log de importações do Read.ai (tabela readai_import_log). Best-effort: nunca lança,
 * para não quebrar a ingestão. Visível no admin (Configurações → Read.ai).
 */

export type ImportAction = 'created' | 'updated' | 'merged' | 'skipped' | 'error' | 'possible_duplicate'
export type ImportSource = 'connect' | 'cron' | 'manual' | 'webhook'

export interface ReadAiImportEntry {
  runId?: string | null
  userId?: string | null
  source: ImportSource
  externalMeetingId?: string | null
  accountId?: string | null
  title?: string | null
  meetingDate?: string | null
  action: ImportAction
  detail?: string | null
}

export async function logReadAiImport(entry: ReadAiImportEntry): Promise<void> {
  try {
    const admin = getSupabaseAdminClient() as any
    await admin.from('readai_import_log').insert({
      run_id: entry.runId ?? null,
      user_id: entry.userId ?? null,
      source: entry.source,
      external_meeting_id: entry.externalMeetingId ?? null,
      account_id: entry.accountId ?? null,
      title: entry.title ?? null,
      meeting_date: entry.meetingDate ?? null,
      action: entry.action,
      detail: entry.detail ?? null,
    })
  } catch (e) {
    console.error('[readai] logReadAiImport falhou:', e instanceof Error ? e.message : e)
  }
}

export interface ImportLogRow {
  id: string
  created_at: string
  source: string
  action: ImportAction
  title: string | null
  detail: string | null
  meeting_date: string | null
  account_name: string | null
}

/** Últimas N entradas do log, com o nome da conta (para o admin). */
export async function listRecentImports(limit = 50): Promise<ImportLogRow[]> {
  const admin = getSupabaseAdminClient() as any
  const { data } = await admin
    .from('readai_import_log')
    .select('id, created_at, source, action, title, detail, meeting_date, accounts(name)')
    .order('created_at', { ascending: false })
    .limit(limit)
  return ((data ?? []) as any[]).map((r) => ({
    id: r.id,
    created_at: r.created_at,
    source: r.source,
    action: r.action,
    title: r.title,
    detail: r.detail,
    meeting_date: r.meeting_date,
    account_name: r.accounts?.name ?? null,
  }))
}

/** Mantém o log enxuto (remove entradas com mais de 60 dias). Best-effort. */
export async function pruneImportLog(): Promise<void> {
  try {
    const admin = getSupabaseAdminClient() as any
    const cutoff = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString()
    await admin.from('readai_import_log').delete().lt('created_at', cutoff)
  } catch {
    /* best-effort */
  }
}
