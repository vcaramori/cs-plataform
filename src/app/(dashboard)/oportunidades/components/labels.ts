import type { OpportunityType, OpportunityItemStatus } from '@/lib/opportunities/types'

export type OppTypeKey = OpportunityType
export type OppStatusKey = OpportunityItemStatus

export const OPP_TYPE_LABELS: Record<string, string> = {
  upsell_plan: 'Upsell de Plano',
  system_need: 'Necessidade de Sistema',
  end_to_end_gap: 'Gap End-to-End',
  other: 'Outro',
}

export const STATUS_LABELS: Record<string, string> = {
  triage: 'Triagem',
  under_curation: 'Em curadoria',
  qualified: 'Qualificada',
  ready_to_send: 'Pronta p/ Pipedrive',
  sent: 'Enviada',
  won: 'Ganha',
  lost: 'Perdida',
  discarded: 'Descartada',
}

export const SOURCE_LABELS: Record<string, string> = {
  interaction: 'Reunião',
  time_entry: 'Esforço',
  nps_response: 'NPS',
  support_ticket: 'Suporte',
  manual: 'Manual',
}
