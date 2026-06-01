// ============================================================================
// Catálogo de opções RICE (intake da ferramenta de produto).
// Produto/Squad e Épico vêm das tabelas products/product_epics (de→para).
// Tipo e Criticidade são listas fixas — confirmar valores definitivos com o PO.
// ============================================================================

export const ACTIVITY_TYPES = [
  'Quick Win',
  'Incremental',
  'Estratégico',
  'Bug / Correção',
] as const

export const CRITICALITIES = [
  'Baixa',
  'Média',
  'Alta',
  'Crítica',
] as const

export type ActivityType = (typeof ACTIVITY_TYPES)[number]
export type Criticality = (typeof CRITICALITIES)[number]

/** Escala dos sliders de Impacto (RICE). */
export const IMPACT_MIN = 1
export const IMPACT_MAX = 10
export const IMPACT_DEFAULT = 5
