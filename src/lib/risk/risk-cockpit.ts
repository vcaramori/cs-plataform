// ============================================================================
// Risco Unificado — consolida os sinais fragmentados (health v2, risco IA,
// alertas proativos, riscos manuais, renovação) num único perfil por conta,
// priorizável por ARR. Núcleo puro (sem I/O) — a API monta os inputs.
// ============================================================================

export type RiskLevel = 'critical' | 'high' | 'medium' | 'low' | 'none'
export type Treatment = 'pendente' | 'em_tratamento' | 'tratado'

/** Tipos de alerta proativo que representam RISCO (expansion_signal/new_ticket não são). */
export const RISK_ALERT_TYPES = new Set([
  'churn_risk', 'silent_customer', 'renewal_upcoming', 'nps_detractor_unactioned',
  'adoption_anomaly', 'playbook_trigger', 'contract_risk', 'sentiment_trigger',
])

const ALERT_LABEL: Record<string, string> = {
  churn_risk: 'Risco de churn',
  silent_customer: 'Cliente silencioso',
  renewal_upcoming: 'Renovação próxima',
  nps_detractor_unactioned: 'Detrator NPS sem ação',
  adoption_anomaly: 'Queda de adoção',
  playbook_trigger: 'Gatilho de playbook',
  contract_risk: 'Risco de contrato',
  sentiment_trigger: 'Sentimento negativo',
}

const RANK: Record<RiskLevel, number> = { none: 0, low: 1, medium: 2, high: 3, critical: 4 }
export function worst(a: RiskLevel, b: RiskLevel): RiskLevel {
  return RANK[a] >= RANK[b] ? a : b
}
export function riskLevelRank(l: RiskLevel): number { return RANK[l] }

export interface ClassifyInput {
  id: string
  name: string
  segment: string | null
  csm_owner_id: string | null
  owner_name?: string | null
  health_score: number | null
  health_score_v2: number | null
  ai_risk_score: number | null
  ai_sentiment: string | null
  ai_reasoning: string | null
  alerts: { type: string; severity: string; message: string | null }[]
  manualRisks: { risk_type: string | null; severity: string | null; status: string | null }[]
  arr: number
  renewalDate: string | null
  treatment: Treatment
  curatedFalsePositive: boolean
  today?: string // YYYY-MM-DD (injetável para testes; default = hoje)
}

export interface AccountRiskProfile {
  id: string
  name: string
  segment: string | null
  csm_owner_id: string | null
  owner_name: string | null
  health: number | null
  aiRisk: number | null
  aiReasoning: string | null
  riskLevel: RiskLevel
  reasons: string[]
  arr: number
  arrAtRisk: number
  renewalDays: number | null
  treatment: Treatment
  curatedFalsePositive: boolean
}

function daysUntil(dateStr: string | null, today: string): number | null {
  if (!dateStr) return null
  const d = new Date(dateStr + (dateStr.length <= 10 ? 'T12:00:00' : ''))
  const t = new Date(today + 'T12:00:00')
  if (isNaN(d.getTime())) return null
  return Math.round((d.getTime() - t.getTime()) / 86400000)
}

/**
 * Classifica o risco unificado de uma conta a partir dos sinais disponíveis.
 * Pega sempre o PIOR nível entre health, risco IA, alertas, riscos manuais e renovação,
 * e monta os "drivers" (motivos legíveis) para a UI.
 */
export function classifyAccountRisk(input: ClassifyInput): AccountRiskProfile {
  const today = input.today ?? new Date().toISOString().slice(0, 10)
  // health 0/null = NÃO COMPUTADO (não é "crítico"). Consistente com o resto do código
  // (cron usa `health_score_v2 || 50`). Evita marcar todo o portfólio como crítico
  // quando o score ainda não foi calculado.
  const v2 = input.health_score_v2
  const v1 = input.health_score
  const health = (v2 != null && v2 > 0) ? v2 : (v1 != null && v1 > 0) ? v1 : null
  const reasons: string[] = []
  let level: RiskLevel = 'none'

  // Health (v2)
  if (health != null) {
    if (health < 40) { level = worst(level, 'critical'); reasons.push(`Health crítico (${Math.round(health)})`) }
    else if (health < 50) { level = worst(level, 'high'); reasons.push(`Health baixo (${Math.round(health)})`) }
    else if (health < 60) { level = worst(level, 'medium'); reasons.push(`Health em atenção (${Math.round(health)})`) }
  }

  // Risco IA
  if (input.ai_risk_score != null) {
    if (input.ai_risk_score >= 80) { level = worst(level, 'critical'); reasons.push(`Risco IA ${input.ai_risk_score}`) }
    else if (input.ai_risk_score >= 60) { level = worst(level, 'high'); reasons.push(`Risco IA ${input.ai_risk_score}`) }
    else if (input.ai_risk_score >= 40) { level = worst(level, 'medium'); reasons.push(`Risco IA ${input.ai_risk_score}`) }
  }
  if (input.ai_sentiment === 'at-risk' || input.ai_sentiment === 'negative') {
    level = worst(level, 'high')
    if (input.ai_risk_score == null) reasons.push(`Sentimento ${input.ai_sentiment === 'at-risk' ? 'em risco' : 'negativo'} (IA)`)
  }

  // Alertas proativos de risco (ativos)
  for (const a of input.alerts) {
    if (!RISK_ALERT_TYPES.has(a.type)) continue
    level = worst(level, a.severity === 'critical' ? 'critical' : 'high')
    reasons.push(ALERT_LABEL[a.type] ?? a.type)
  }

  // Riscos manuais (CS Ops) não resolvidos
  for (const r of input.manualRisks) {
    if (r.status === 'resolved') continue
    const sev = (r.severity ?? '').toLowerCase()
    const lv: RiskLevel = sev === 'critical' ? 'critical' : sev === 'high' ? 'high' : sev === 'medium' ? 'medium' : 'low'
    level = worst(level, lv)
    reasons.push(`Risco manual: ${r.risk_type ?? 'geral'} (${sev || 'baixo'})`)
  }

  // Renovação próxima
  const renewalDays = daysUntil(input.renewalDate, today)
  if (renewalDays != null && renewalDays >= 0) {
    if (renewalDays <= 30 && (health ?? 100) < 60) { level = worst(level, 'critical'); reasons.push(`Renovação em ${renewalDays}d com health baixo`) }
    else if (renewalDays <= 90) { level = worst(level, 'medium'); reasons.push(`Renovação em ${renewalDays}d`) }
  }

  const atRisk = RANK[level] >= RANK['medium']
  return {
    id: input.id,
    name: input.name,
    segment: input.segment,
    csm_owner_id: input.csm_owner_id,
    owner_name: input.owner_name ?? null,
    health,
    aiRisk: input.ai_risk_score,
    aiReasoning: input.ai_reasoning,
    riskLevel: level,
    reasons,
    arr: input.arr,
    arrAtRisk: atRisk ? input.arr : 0,
    renewalDays,
    treatment: input.treatment,
    curatedFalsePositive: input.curatedFalsePositive,
  }
}

export interface CockpitKpis {
  arrAtRisk: number
  arrTotal: number
  accountsAtRisk: number
  critical: number
  high: number
  renewalsAtRisk: number
  renewalsAtRiskArr: number
  avgHealth: number | null
  treatedPct: number | null
}

export interface Distribution { key: string; label: string; count: number; arrAtRisk: number; critical: number }

/** Agrega o portfólio classificado em KPIs + distribuições para o cockpit. */
export function buildCockpitAggregates(profiles: AccountRiskProfile[], arrTotal: number): {
  kpis: CockpitKpis
  bySegment: Distribution[]
  byOwner: Distribution[]
  byDriver: { label: string; count: number }[]
} {
  const atRisk = profiles.filter(p => RANK[p.riskLevel] >= RANK['medium'] && !p.curatedFalsePositive)
  const critical = profiles.filter(p => p.riskLevel === 'critical' && !p.curatedFalsePositive).length
  const high = profiles.filter(p => p.riskLevel === 'high' && !p.curatedFalsePositive).length
  const renewals = atRisk.filter(p => p.renewalDays != null && p.renewalDays >= 0 && p.renewalDays <= 90)
  const healthVals = profiles.map(p => p.health).filter((h): h is number => h != null)
  const treatable = atRisk.length
  const treated = atRisk.filter(p => p.treatment !== 'pendente').length

  const kpis: CockpitKpis = {
    arrAtRisk: atRisk.reduce((s, p) => s + p.arrAtRisk, 0),
    arrTotal,
    accountsAtRisk: atRisk.length,
    critical,
    high,
    renewalsAtRisk: renewals.length,
    renewalsAtRiskArr: renewals.reduce((s, p) => s + p.arr, 0),
    avgHealth: healthVals.length ? Math.round(healthVals.reduce((s, h) => s + h, 0) / healthVals.length) : null,
    treatedPct: treatable ? Math.round((treated / treatable) * 100) : null,
  }

  const groupBy = (keyFn: (p: AccountRiskProfile) => { key: string; label: string }): Distribution[] => {
    const map = new Map<string, Distribution>()
    for (const p of atRisk) {
      const { key, label } = keyFn(p)
      const d = map.get(key) ?? { key, label, count: 0, arrAtRisk: 0, critical: 0 }
      d.count++; d.arrAtRisk += p.arrAtRisk; if (p.riskLevel === 'critical') d.critical++
      map.set(key, d)
    }
    return Array.from(map.values()).sort((a, b) => b.count - a.count)
  }

  const bySegment = groupBy(p => ({ key: p.segment ?? 'sem-segmento', label: p.segment ?? 'Sem segmento' }))
  const byOwner = groupBy(p => ({ key: p.csm_owner_id ?? 'sem-dono', label: p.owner_name ?? 'Sem responsável' }))

  const driverCount = new Map<string, number>()
  for (const p of atRisk) for (const r of p.reasons) {
    const label = r.replace(/\s*\(.*\)$/, '').replace(/\s+em \d+d.*$/, ' (renovação)').replace(/\s+\d+$/, '')
    driverCount.set(label, (driverCount.get(label) ?? 0) + 1)
  }
  const byDriver = Array.from(driverCount.entries()).map(([label, count]) => ({ label, count })).sort((a, b) => b.count - a.count).slice(0, 8)

  return { kpis, bySegment, byOwner, byDriver }
}
