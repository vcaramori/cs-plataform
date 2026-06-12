import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import type { ExtractedOpportunity, OpportunitySource, OpportunityType } from './types'

const VALID_TYPES: OpportunityType[] = ['upsell_plan', 'system_need', 'end_to_end_gap', 'other']

export interface PersistOpportunityInput {
  signals: ExtractedOpportunity[]
  accountId: string
  sourceType: OpportunitySource
  sourceId?: string | null
  createdBy?: string | null
  requesterEmail?: string | null
}

/**
 * Persiste sinais de oportunidade extraídos pela IA (parte "opportunities" da passada
 * única). Idempotente por (source_type, source_id) para reingestão segura. Vetoriza
 * cada sinal em embeddings(source_type='opportunity_signal') para dedup cross-customer.
 * Nunca lança — falhas são logadas. Retorna o nº de sinais criados.
 */
export async function persistOpportunitySignals(input: PersistOpportunityInput): Promise<number> {
  const { signals, accountId, sourceType, sourceId, createdBy, requesterEmail } = input
  const valid = (signals ?? []).filter((s) => s && typeof s.verbatim === 'string' && typeof s.summary === 'string')
  if (valid.length === 0) return 0

  const db = getSupabaseAdminClient() as any

  // Reingestão segura: remove sinais IA anteriores da mesma origem
  if (sourceId) {
    await db
      .from('opportunity_signals')
      .delete()
      .eq('source_type', sourceType)
      .eq('source_id', sourceId)
      .eq('ai_extracted', true)
  }

  const rows = valid.map((s) => ({
    account_id: accountId,
    source_type: sourceType,
    source_id: sourceId ?? null,
    verbatim: String(s.verbatim).slice(0, 1000),
    summary: String(s.summary).slice(0, 500),
    opportunity_type: VALID_TYPES.includes(s.opportunity_type) ? s.opportunity_type : 'other',
    requester_name: s.requester ? String(s.requester).slice(0, 160) : null,
    requester_email: requesterEmail ?? null,
    created_by: createdBy ?? null,
    ai_extracted: true,
    ai_confidence: typeof s.confidence === 'number' ? s.confidence : 0.6,
  }))

  const { data: inserted, error } = await db
    .from('opportunity_signals')
    .insert(rows)
    .select('id, verbatim')
  if (error) {
    console.error('[opportunities/persist] insert error:', error.message)
    return 0
  }

  await Promise.all(
    (inserted ?? []).map((sig: any) =>
      storeEmbeddings(accountId, 'opportunity_signal', sig.id, sig.verbatim).catch((e) =>
        console.error('[opportunities/persist] embed error:', e?.message)
      )
    )
  )

  return inserted?.length ?? 0
}
