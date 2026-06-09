import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { storeEmbeddings } from '@/lib/supabase/vector-search'
import { ingestNPSResponse, ingestOnboardingEvent, ingestNegotiation } from '@/lib/rag/rag-pipeline'

/**
 * Resiliência do RAG: reprocessa embeddings FALTANTES.
 * "Faltante" = registro de origem sem nenhuma linha em `embeddings` para aquele
 * source_type (cobre tanto nunca-tentado quanto falha por falta de créditos).
 * Idempotente: re-rodar só processa o que ainda falta.
 */

// eslint-disable-next-line @typescript-eslint/no-explicit-any
type Admin = any

export type ReembedSourceType = 'interaction' | 'support_ticket' | 'nps_response' | 'onboarding' | 'negotiation'

type TypeCfg = {
  table: string
  cols: string
  applyFilter?: (q: any) => any
  embed: (admin: Admin, row: any) => Promise<void>
}

const CFG: Record<ReembedSourceType, TypeCfg> = {
  interaction: {
    table: 'interactions',
    cols: 'id, account_id, date, type, title, raw_transcript',
    applyFilter: (q) => q.not('raw_transcript', 'is', null),
    embed: async (_admin, r) => {
      const text = `Interação | ${r.date ?? ''} | Tipo: ${r.type ?? ''}${r.title ? ` | ${r.title}` : ''}\n${r.raw_transcript ?? ''}`
      await storeEmbeddings(r.account_id, 'interaction', r.id, text)
    },
  },
  support_ticket: {
    table: 'support_tickets',
    cols: 'id, account_id, title, description, opened_at',
    embed: async (_admin, r) => {
      await storeEmbeddings(r.account_id, 'support_ticket', r.id, `Ticket | ${r.opened_at ?? ''} | ${r.title ?? ''}\n${r.description ?? ''}`)
    },
  },
  nps_response: {
    table: 'nps_responses',
    cols: 'id, comment, score',
    applyFilter: (q) => q.not('comment', 'is', null).not('score', 'is', null),
    embed: async (_admin, r) => { await ingestNPSResponse(r.id) },
  },
  onboarding: {
    table: 'onboarding_events',
    cols: 'id',
    embed: async (_admin, r) => { await ingestOnboardingEvent(r.id) },
  },
  negotiation: {
    table: 'contract_negotiation_history',
    cols: 'id',
    embed: async (_admin, r) => { await ingestNegotiation(r.id) },
  },
}

export type ReembedStats = Record<string, { missing: number; processed: number; failed: number }>

export async function reembedMissing(opts: { sourceTypes?: ReembedSourceType[]; limitPerType?: number } = {}): Promise<ReembedStats> {
  const admin = getSupabaseAdminClient() as any
  const types = opts.sourceTypes ?? (Object.keys(CFG) as ReembedSourceType[])
  const limit = Math.min(opts.limitPerType ?? 200, 1000)
  const stats: ReembedStats = {}

  for (const type of types) {
    const cfg = CFG[type]
    const out = { missing: 0, processed: 0, failed: 0 }
    try {
      // Candidatos (recentes primeiro); pega um excedente p/ filtrar os já indexados.
      let q = admin.from(cfg.table).select(cfg.cols).order('created_at', { ascending: false }).limit(limit * 4)
      if (cfg.applyFilter) q = cfg.applyFilter(q)
      const { data: rows, error } = await q
      if (error) { stats[type] = { ...out }; console.error(`[REEMBED] ${type} query error:`, error.message); continue }

      const ids = (rows ?? []).map((r: any) => r.id)
      const existing = new Set<string>()
      if (ids.length) {
        const { data: emb } = await admin.from('embeddings').select('source_id').eq('source_type', type === 'onboarding' ? 'onboarding' : type).in('source_id', ids)
        for (const e of emb ?? []) existing.add(e.source_id)
      }
      const missing = (rows ?? []).filter((r: any) => !existing.has(r.id)).slice(0, limit)
      out.missing = missing.length

      for (const row of missing) {
        try {
          await cfg.embed(admin, row)
          out.processed++
        } catch (e: any) {
          out.failed++
          console.error(`[REEMBED-PENDING] ${type}:${row.id} falhou — ${e?.message ?? e}`)
        }
      }
    } catch (e: any) {
      console.error(`[REEMBED] ${type} erro fatal:`, e?.message ?? e)
    }
    stats[type] = out
  }

  return stats
}
