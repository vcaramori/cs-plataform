// ============================================================================
// Régua canônica ÚNICA de health/risco do cliente.
// Esta é a ÚNICA fonte de faixas (bands) e da definição de "em risco" no app.
// Mudar os limites aqui reflete em TODAS as telas (dashboard, cockpit de risco,
// gauge da conta, home, cs-ops). Antes existiam ~5 réguas divergentes — não
// reintroduza thresholds inline; sempre use classifyHealth()/isAtRiskScore().
//
// Fonte da verdade do SCORE = health_score (manual). O health_score_v2
// (ponderado) e o shadow/IA são camadas advisory/alerta, não entram aqui.
// ============================================================================

export type HealthBand = 'saudavel' | 'atencao' | 'risco' | 'critico' | 'sem-dado'

/** Limites canônicos (score 0-100). Único lugar para ajustar a régua. */
export const HEALTH_THRESHOLDS = {
  /** >= 70 → saudável */
  saudavel: 70,
  /** 50–69 → atenção (watch list, NÃO conta como "em risco") */
  atencao: 50,
  /** 40–49 → em risco */
  risco: 40,
  /** < 40 → crítico */
} as const

export interface HealthClassification {
  band: HealthBand
  /** Rótulo curto pt-BR para exibição. */
  label: string
  /** Entra na contagem de "contas em risco" (band risco ou crítico). */
  atRisk: boolean
  /** Cor sólida (hex) para SVG/inline style (ex.: gauge). */
  color: string
  /** Classe Tailwind de texto. */
  textClass: string
  /** Classe Tailwind para chip/badge (fundo + texto). */
  badgeClass: string
}

const SAUDAVEL: HealthClassification = {
  band: 'saudavel', label: 'Saudável', atRisk: false,
  color: '#10b981', textClass: 'text-emerald-500', badgeClass: 'bg-success/15 text-success',
}
const ATENCAO: HealthClassification = {
  band: 'atencao', label: 'Atenção', atRisk: false,
  color: '#f7941e', textClass: 'text-amber-500', badgeClass: 'bg-amber-500/15 text-amber-500',
}
const RISCO: HealthClassification = {
  band: 'risco', label: 'Em risco', atRisk: true,
  color: '#ef4444', textClass: 'text-red-500', badgeClass: 'bg-red-500/15 text-red-500',
}
const CRITICO: HealthClassification = {
  band: 'critico', label: 'Crítico', atRisk: true,
  color: '#dc2626', textClass: 'text-red-600', badgeClass: 'bg-red-600/20 text-red-600',
}
const SEM_DADO: HealthClassification = {
  band: 'sem-dado', label: 'Sem dados', atRisk: false,
  color: '#94a3b8', textClass: 'text-content-secondary', badgeClass: 'bg-muted text-content-secondary',
}

/**
 * Classifica um health score (0-100) na régua canônica.
 * `null`/`undefined` = não computado → não conta como risco ("Sem dados").
 */
export function classifyHealth(score: number | null | undefined): HealthClassification {
  if (score == null || Number.isNaN(score)) return SEM_DADO
  if (score >= HEALTH_THRESHOLDS.saudavel) return SAUDAVEL
  if (score >= HEALTH_THRESHOLDS.atencao) return ATENCAO
  if (score >= HEALTH_THRESHOLDS.risco) return RISCO
  return CRITICO
}

/** "Em risco" pela régua canônica (score manual abaixo de "atenção"). */
export function isAtRiskScore(score: number | null | undefined): boolean {
  return classifyHealth(score).atRisk
}
