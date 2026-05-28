/**
 * All platform modules available for permission matrix.
 * Used by the roles page (settings/roles) and future enforcement middleware.
 *
 * When adding a new module/screen to the platform, add it here.
 */
export const PLATFORM_MODULES = [
  { module: 'home',          label: 'Home & Command Center' },
  { module: 'atividades',    label: 'Atividades do CSM' },
  { module: 'dashboard',     label: 'Dashboard & Home' },
  { module: 'suporte',       label: 'Suporte & Tickets' },
  { module: 'nps',           label: 'Pesquisas NPS' },
  { module: 'voc',           label: 'Voz do Cliente (VoC)' },
  { module: 'adoption',      label: 'Adoption & Heatmaps' },
  { module: 'esforco',       label: 'Esforço & Capacity' },
  { module: 'ask',           label: 'Perguntar (Ask AI)' },
  { module: 'playbooks',     label: 'Automação & Playbooks' },
  { module: 'contracts',     label: 'Contratos & Faturamento' },
  { module: 'accounts',      label: 'Gestão de Contas' },
  { module: 'governance',    label: 'Governança & Auditoria' },
  { module: 'sla_config',    label: 'Configuração SLA' },
  { module: 'product_config', label: 'Funcionalidades & Planos' },
] as const

export type PlatformModule = (typeof PLATFORM_MODULES)[number]['module']

export type PermissionRow = {
  module: string
  label: string
  view: boolean
  create: boolean
  edit: boolean
  delete: boolean
  export: boolean
  view_team: boolean
}

export function makeDefaultPermissions(): PermissionRow[] {
  return PLATFORM_MODULES.map(m => ({
    module: m.module,
    label: m.label,
    view: false,
    create: false,
    edit: false,
    delete: false,
    export: false,
    view_team: false,
  }))
}
