import { getSupabaseAdminClient } from '@/lib/supabase/admin'

/**
 * Score RICE da Wishlist — PRIMITIVA ÚNICA (fonte de verdade; reusada onde quer que o score apareça,
 * para nunca divergir). É RICE-sem-E: o Esforço (E) fica com o Produto, que conhece o custo de dev;
 * aqui calculamos R×I×C (prioridade ponderada por demanda) e o gestor RICE divide pelo esforço deles.
 * Pesos editáveis em `app_settings.wishlist_rice_weights` (zero-env).
 */

export interface RiceInputs {
  reach_pct: number | null
  impact_differentiation: number | null
  impact_commercial_opportunity: number | null
  impact_satisfaction: number | null
  impact_churn_prevention: number | null
  commercial_commitment: boolean | null
  confidence_competitor_has: boolean | null
  confidence_wishlist_clients: boolean | null
  confidence_wishlist_leads: boolean | null
  demand_accounts?: number | null
}

export interface RiceWeights {
  impact_weights: { differentiation: number; commercial_opportunity: number; satisfaction: number; churn_prevention: number }
  commitment_multiplier: number
  confidence_base: number
  confidence_clients: number
  confidence_competitor: number
  confidence_leads: number
}

export const DEFAULT_RICE_WEIGHTS: RiceWeights = {
  impact_weights: { differentiation: 1, commercial_opportunity: 1, satisfaction: 1, churn_prevention: 1 },
  commitment_multiplier: 1.25,
  confidence_base: 0.5,
  confidence_clients: 0.2,
  confidence_competitor: 0.15,
  confidence_leads: 0.15,
}

export async function loadRiceWeights(admin?: any): Promise<RiceWeights> {
  try {
    const db = admin ?? (getSupabaseAdminClient() as any)
    const { data } = await db.from('app_settings').select('value').eq('key', 'wishlist_rice_weights').maybeSingle()
    const v = data?.value as Partial<RiceWeights> | undefined
    if (v && typeof v === 'object') return { ...DEFAULT_RICE_WEIGHTS, ...v, impact_weights: { ...DEFAULT_RICE_WEIGHTS.impact_weights, ...(v.impact_weights ?? {}) } }
  } catch { /* usa default */ }
  return DEFAULT_RICE_WEIGHTS
}

/**
 * Calcula o rice_score (0..~125): R × I × C × 100.
 * - R (alcance): reach_pct/100; se nulo, demand_accounts/contas_ativas.
 * - I (impacto): média ponderada dos 4 impactos (1-10, → 0..1) × multiplicador de compromisso.
 * - C (confiança): base + contribuições (clientes/concorrente/leads), teto 1.
 */
export function computeRiceScore(i: RiceInputs, totalActiveAccounts: number, w: RiceWeights = DEFAULT_RICE_WEIGHTS): number {
  const reach = i.reach_pct != null
    ? Math.max(0, Math.min(1, i.reach_pct / 100))
    : (totalActiveAccounts > 0 ? Math.min(1, (i.demand_accounts ?? 0) / totalActiveAccounts) : 0)

  const iw = w.impact_weights
  const parts: Array<[number | null, number]> = [
    [i.impact_differentiation, iw.differentiation],
    [i.impact_commercial_opportunity, iw.commercial_opportunity],
    [i.impact_satisfaction, iw.satisfaction],
    [i.impact_churn_prevention, iw.churn_prevention],
  ]
  let num = 0, den = 0
  for (const [v, weight] of parts) { if (v != null) { num += (v / 10) * weight; den += weight } }
  let impact = den > 0 ? num / den : 0.5
  if (i.commercial_commitment) impact *= w.commitment_multiplier

  let conf = w.confidence_base
  if (i.confidence_wishlist_clients) conf += w.confidence_clients
  if (i.confidence_competitor_has) conf += w.confidence_competitor
  if (i.confidence_wishlist_leads) conf += w.confidence_leads
  conf = Math.min(conf, 1)

  return Math.round(reach * impact * conf * 100 * 10) / 10
}

/** Recalcula e persiste wishlist_items.rice_score a partir dos campos atuais do item. */
export async function recomputeItemRice(itemId: string): Promise<number> {
  const db = getSupabaseAdminClient() as any
  const { data: item } = await db
    .from('wishlist_items')
    .select('reach_pct, impact_differentiation, impact_commercial_opportunity, impact_satisfaction, impact_churn_prevention, commercial_commitment, confidence_competitor_has, confidence_wishlist_clients, confidence_wishlist_leads, demand_accounts')
    .eq('id', itemId)
    .maybeSingle()
  if (!item) return 0
  const [weights, { count }] = await Promise.all([
    loadRiceWeights(db),
    db.from('accounts').select('id', { count: 'exact', head: true }),
  ])
  const score = computeRiceScore(item as RiceInputs, count ?? 0, weights)
  await db.from('wishlist_items').update({ rice_score: score }).eq('id', itemId)
  return score
}
