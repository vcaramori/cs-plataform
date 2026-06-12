// ============================================================================
// Tipos do módulo Oportunidades (espelho da Wishlist, foco comercial)
// Modelo de dois níveis: Signal (menção comercial) -> Item (oportunidade canônica)
// ============================================================================

export type OpportunitySource =
  | 'interaction'
  | 'time_entry'
  | 'nps_response'
  | 'support_ticket'
  | 'manual'

/** Tipos de oportunidade comercial. */
export type OpportunityType =
  | 'upsell_plan'      // cliente no plano X precisa de feature já existente no plano Y
  | 'system_need'      // necessidade de um sistema/módulo correlato a S&OP (MPS, DRP, MRO…)
  | 'end_to_end_gap'   // pediu solução end-to-end que não temos
  | 'other'

export type OppTriageOutcome =
  | 'pending'
  | 'already_available' // já vendemos/já existe no plano (matched_plan/feature)
  | 'promoted'          // virou/entrou em um item
  | 'duplicate'
  | 'dismissed'

export type OpportunityItemStatus =
  | 'triage'
  | 'under_curation'
  | 'qualified'
  | 'ready_to_send'    // preparado para o Pipedrive
  | 'sent'             // marcado como enviado ao Pipedrive (manual)
  | 'won'
  | 'lost'
  | 'discarded'

export type OpportunityPriority = 'low' | 'medium' | 'high' | 'critical'

export interface OpportunitySignal {
  id: string
  account_id: string
  item_id: string | null
  source_type: OpportunitySource
  source_id: string | null
  verbatim: string
  summary: string | null
  opportunity_type: OpportunityType
  requester_name: string | null
  requester_email: string | null
  created_by: string | null
  ai_extracted: boolean
  ai_confidence: number | null
  triage_outcome: OppTriageOutcome
  triage_note: string | null
  matched_plan_id: string | null
  matched_feature_id: string | null
  triaged_by: string | null
  triaged_at: string | null
  created_at: string
}

export interface OpportunityItem {
  id: string
  title: string
  need: string | null
  desired_outcome: string | null
  opportunity_type: OpportunityType
  category: string | null
  status: OpportunityItemStatus
  priority: OpportunityPriority | null
  demand_accounts: number
  demand_arr: number
  estimated_value: number | null
  owner_id: string | null
  commercial_brief: CommercialBrief | null
  created_by: string | null
  created_at: string
  updated_at: string
  sent_at: string | null
  sent_by: string | null
}

/** Resultado bruto da extração por IA (parte "opportunities" da passada única). */
export interface ExtractedOpportunity {
  verbatim: string
  summary: string
  opportunity_type: OpportunityType
  requester?: string | null
  confidence: number
}

/** Sugestão de "já temos no plano Y" (caminho upsell / já disponível). */
export interface PlanMatch {
  plan_id: string | null
  plan_name: string | null
  feature_id: string | null
  feature_name: string | null
  confidence: number
  rationale: string
}

/** Pacote comercial montado para o Pipedrive (sem envio automático nesta fase). */
export interface CommercialBrief {
  titulo: string
  tipo: OpportunityType
  necessidade: string | null
  resultado_desejado: string | null
  categoria: string | null
  prioridade: OpportunityPriority | null
  valor_estimado: number | null
  narrative: string
  plano_sugerido: { id: string; name: string } | null
  feature_relacionada: { id: string; name: string } | null
  clientes: { account_id: string; nome: string; arr: number; segmento: string | null }[]
  demand: {
    accounts: number
    arr: number
    segments: string[]
    accounts_list: { account_id: string; account_name: string; arr: number; segment: string | null }[]
  }
  evidence: { account_name: string; verbatim: string; source_type: OpportunitySource; date: string }[]
  generated_at: string
}
