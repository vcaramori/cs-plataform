import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const KEY = 'sop_glossary'

/** Glossário de siglas/módulos de sistemas correlatos a S&OP (ex.: MPS, DRP, MRO). */
export type SopGlossary = Record<string, string>

export const DEFAULT_SOP_GLOSSARY: SopGlossary = {
  'S&OP': 'Sales and Operations Planning — planejamento integrado de vendas e operações',
  'S&OE': 'Sales and Operations Execution — execução de curto prazo do S&OP',
  MPS: 'Master Production Schedule — plano mestre de produção',
  MRP: 'Material Requirements Planning — planejamento de necessidades de materiais',
  DRP: 'Distribution Requirements Planning — planejamento de necessidades de distribuição',
  MRO: 'Maintenance, Repair and Operations — manutenção, reparo e operações',
  CPFR: 'Collaborative Planning, Forecasting and Replenishment',
  IBP: 'Integrated Business Planning — planejamento integrado de negócios',
}

let cache: { at: number; value: SopGlossary } | null = null
const TTL_MS = 60_000

export function invalidateSopGlossaryCache() { cache = null }

export async function getSopGlossary(): Promise<SopGlossary> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value
  const db = getSupabaseAdminClient() as any
  let value: SopGlossary = DEFAULT_SOP_GLOSSARY
  try {
    const { data } = await db.from('app_settings').select('value').eq('key', KEY).maybeSingle()
    if (data?.value && typeof data.value === 'object' && Object.keys(data.value).length > 0) {
      value = data.value as SopGlossary
    }
  } catch (e) {
    console.error('[opportunities/glossary] load failed:', e instanceof Error ? e.message : e)
  }
  cache = { at: Date.now(), value }
  return value
}

/** Renderiza o glossário como bloco de texto para injeção no prompt da IA. */
export function renderGlossary(glossary: SopGlossary): string {
  const entries = Object.entries(glossary)
  if (entries.length === 0) return ''
  return entries.map(([sigla, sig]) => `- ${sigla}: ${sig}`).join('\n')
}
