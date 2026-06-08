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
  { module: 'onboarding',    label: 'Onboarding & Implantação' },
  { module: 'voc',           label: 'Voz do Cliente (VoC)' },
  { module: 'adoption',      label: 'Adoption & Heatmaps' },
  { module: 'esforco',       label: 'Esforço & Capacity' },
  { module: 'ask',           label: 'Perguntar (Ask AI)' },
  { module: 'playbooks',     label: 'Automação & Playbooks' },
  { module: 'wishlist',      label: 'Wishlist & Pedidos' },
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

export type PermissionAction = keyof Omit<PermissionRow, 'module' | 'label'>

/**
 * Aplica um toggle de permissão a uma linha, com as regras de UX do cadastro de perfil:
 * - desligar "view" (Visualizar) → limpa TUDO (sem view não há acesso, e some do sidebar).
 * - ligar "create" (Criar) → marca TUDO true (inclui Escopo Geral) p/ facilitar o cadastro.
 * - caso contrário → apenas alterna o campo.
 */
export function applyPermissionToggle(
  row: PermissionRow,
  action: PermissionAction,
  checked: boolean
): PermissionRow {
  if (action === 'view' && !checked) {
    return { ...row, view: false, create: false, edit: false, delete: false, export: false, view_team: false }
  }
  if (action === 'create' && checked) {
    return { ...row, view: true, create: true, edit: true, delete: true, export: true, view_team: true }
  }
  return { ...row, [action]: checked }
}
