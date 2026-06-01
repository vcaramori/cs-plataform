import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { AI_INSTRUCTION_MAP, AI_INSTRUCTIONS } from './instructions-catalog'

// ============================================================================
// Núcleo de governança de IA: contexto global + instrução por tarefa + skills.
// buildSystemInstruction(taskKey, fallback?) monta o system instruction final:
//   [contexto global] + [skills aplicáveis] + [override OU default do catálogo OU fallback]
// Defaults = comportamento atual → migração segura.
// ============================================================================

export interface AIContextRules {
  nps: { promoter_min: number; passive_min: number }
  financial: { renewal_urgent_days: number; health_discrepancy_alert: number }
  silence_by_segment: Record<string, number>
  contact_high_risk: { influence_levels: string[]; seniority_levels: string[] }
  rag_fallback: { enable: boolean; factor: number; min: number }
}

export const DEFAULT_AI_CONTEXT_RULES: AIContextRules = {
  nps: { promoter_min: 9, passive_min: 7 },
  financial: { renewal_urgent_days: 90, health_discrepancy_alert: 20 },
  silence_by_segment: { 'Indústria': 14, 'MRO': 14, 'Varejo': 21, 'Distribuidor': 30, default: 21 },
  contact_high_risk: { influence_levels: ['Champion'], seniority_levels: ['C-Level', 'VP', 'Director'] },
  rag_fallback: { enable: true, factor: 0.5, min: 0.2 },
}

interface Skill { name: string; body: string; applies_to: string[]; is_active: boolean; sort_order: number }

interface CacheShape {
  at: number
  globalContext: string
  rules: AIContextRules
  overrides: Record<string, string>
  skills: Skill[]
}

let cache: CacheShape | null = null
const TTL_MS = 60_000

export function invalidateAIContextCache() { cache = null }

async function load(): Promise<CacheShape> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache
  const db = getSupabaseAdminClient() as any

  let globalContext = ''
  let rules = DEFAULT_AI_CONTEXT_RULES
  const overrides: Record<string, string> = {}
  let skills: Skill[] = []

  try {
    const keysToLoad = ['ai_global_context', 'ai_context_rules', ...AI_INSTRUCTIONS.map((i) => i.key)]
    const { data: settings } = await db
      .from('app_settings')
      .select('key, value')
      .in('key', keysToLoad)
    for (const row of settings ?? []) {
      if (row.key === 'ai_global_context') {
        globalContext = typeof row.value === 'string' ? row.value : ''
      } else if (row.key === 'ai_context_rules') {
        rules = { ...DEFAULT_AI_CONTEXT_RULES, ...(row.value ?? {}) }
      } else if (typeof row.value === 'string' && row.value.trim()) {
        overrides[row.key] = row.value
      }
    }
  } catch (e) {
    console.error('[ai-context] load settings failed:', e instanceof Error ? e.message : e)
  }

  try {
    const { data: sk } = await db
      .from('ai_skills')
      .select('name, body, applies_to, is_active, sort_order')
      .eq('is_active', true)
      .order('sort_order')
    skills = (sk ?? []) as Skill[]
  } catch (e) {
    console.error('[ai-context] load skills failed:', e instanceof Error ? e.message : e)
  }

  cache = { at: Date.now(), globalContext, rules, overrides, skills }
  return cache
}

export async function getGlobalContext(): Promise<string> {
  return (await load()).globalContext
}

export async function getAIContextRules(): Promise<AIContextRules> {
  return (await load()).rules
}

export async function getApplicableSkills(taskKey: string): Promise<Skill[]> {
  const c = await load()
  return c.skills.filter((s) => s.applies_to?.includes('global') || s.applies_to?.includes(taskKey))
}

/**
 * Monta o system instruction final para uma tarefa de IA.
 * @param taskKey chave da tarefa (ver instructions-catalog.ts)
 * @param fallback default usado quando não há override nem default no catálogo (migração incremental)
 */
export async function buildSystemInstruction(taskKey: string, fallback = ''): Promise<string> {
  const c = await load()
  const override = c.overrides[taskKey]
  const catalogDefault = AI_INSTRUCTION_MAP[taskKey]?.default
  const base = (override && override.trim()) ? override : (catalogDefault ?? fallback)

  const skillBlocks = c.skills
    .filter((s) => s.applies_to?.includes('global') || s.applies_to?.includes(taskKey))
    .map((s) => s.body?.trim())
    .filter(Boolean) as string[]

  return [c.globalContext?.trim(), ...skillBlocks, base?.trim()]
    .filter(Boolean)
    .join('\n\n---\n\n')
}
