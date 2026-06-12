import type { AccountRiskProfile, CockpitKpis, Distribution, RiskLevel, Treatment } from '@/lib/risk/risk-cockpit'

export type { AccountRiskProfile, CockpitKpis, Distribution, RiskLevel, Treatment }

export interface CockpitData {
  scope: string
  kpis: CockpitKpis | null
  accounts: AccountRiskProfile[]
  bySegment: Distribution[]
  byOwner: Distribution[]
  byDriver: { label: string; count: number }[]
  trend: { week: string; signals: number }[]
}

export const LEVEL_LABEL: Record<RiskLevel, string> = {
  critical: 'Crítico', high: 'Alto', medium: 'Médio', low: 'Baixo', none: 'OK',
}

/** Hex (para recharts) + classes Tailwind por nível. */
export const LEVEL_HEX: Record<RiskLevel, string> = {
  critical: '#ef4444', high: '#f59e0b', medium: '#eab308', low: '#3b82f6', none: '#10b981',
}

export const LEVEL_BADGE: Record<RiskLevel, string> = {
  critical: 'bg-red-500/15 text-red-600 dark:text-red-400',
  high: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  medium: 'bg-yellow-500/15 text-yellow-700 dark:text-yellow-400',
  low: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  none: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

export const TREATMENT_LABEL: Record<Treatment, string> = {
  pendente: 'Pendente', em_tratamento: 'Em tratamento', tratado: 'Tratado',
}
export const TREATMENT_BADGE: Record<Treatment, string> = {
  pendente: 'bg-amber-500/15 text-amber-600 dark:text-amber-400',
  em_tratamento: 'bg-blue-500/15 text-blue-600 dark:text-blue-400',
  tratado: 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400',
}

export const brl = (n: number) => `R$ ${Math.round(n || 0).toLocaleString('pt-BR')}`
export const brlCompact = (n: number) => {
  const v = Math.round(n || 0)
  if (v >= 1_000_000) return `R$ ${(v / 1_000_000).toLocaleString('pt-BR', { maximumFractionDigits: 1 })}M`
  if (v >= 1_000) return `R$ ${(v / 1_000).toLocaleString('pt-BR', { maximumFractionDigits: 0 })}k`
  return `R$ ${v.toLocaleString('pt-BR')}`
}
