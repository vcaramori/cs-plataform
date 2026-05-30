// ============================================================================
// Tipos do módulo Wishlist
// Modelo de dois níveis: Signal (menção por cliente) -> Item (ideia canônica)
// ============================================================================

export type WishlistSignalSource =
  | 'interaction'
  | 'time_entry'
  | 'nps_response'
  | 'support_ticket'
  | 'manual'

export type WishlistKind = 'new' | 'enhancement'

export type TriageOutcome =
  | 'pending'
  | 'resolved_existing'        // já existe — CSM mostrou como usar
  | 'insufficient_enhancement' // existe mas não atende — vira melhoria
  | 'not_available_new'        // não temos — vira novo pedido
  | 'dismissed'                // descartado

export type WishlistItemStatus =
  | 'triage'
  | 'under_curation'
  | 'accepted'
  | 'rejected'
  | 'redirected'
  | 'handed_off'
  | 'delivered'

export type WishlistPriority = 'low' | 'medium' | 'high' | 'critical'

export type HandoffTarget = 'export' | 'webhook'
export type HandoffStatus = 'prepared' | 'sent' | 'failed'

export interface WishlistSignal {
  id: string
  account_id: string
  item_id: string | null
  source_type: WishlistSignalSource
  source_id: string | null
  verbatim: string
  summary: string | null
  kind: WishlistKind | null
  requester_name: string | null
  requester_email: string | null
  created_by: string | null
  ai_extracted: boolean
  ai_confidence: number | null
  triage_outcome: TriageOutcome
  triage_note: string | null
  matched_feature_id: string | null
  triaged_by: string | null
  triaged_at: string | null
  created_at: string
}

export interface WishlistItem {
  id: string
  title: string
  problem: string | null
  desired_outcome: string | null
  category: string | null
  kind: WishlistKind
  status: WishlistItemStatus
  matched_feature_id: string | null
  priority: WishlistPriority | null
  demand_accounts: number
  demand_arr: number
  owner_id: string | null
  product_brief: ProductBrief | null
  created_by: string | null
  created_at: string
  updated_at: string
  accepted_at: string | null
  handed_off_at: string | null
}

/** Resultado bruto da extração por IA a partir de um texto livre. */
export interface ExtractedSignal {
  verbatim: string
  summary: string
  kind: WishlistKind
  requester?: string | null
  confidence: number
}

/** Sugestão de feature do catálogo (caminho "já existe / insuficiente"). */
export interface CatalogMatch {
  feature_id: string
  feature_name: string
  confidence: number
  rationale: string
}

/** Pacote refinado enviado ao time de produto. */
export interface ProductBrief {
  title: string
  kind: WishlistKind
  category: string | null
  priority: WishlistPriority | null
  problem: string | null
  desired_outcome: string | null
  narrative: string
  demand: {
    accounts: number
    arr: number
    segments: string[]
    accounts_list: { account_id: string; account_name: string; arr: number; segment: string | null }[]
  }
  related_feature: { id: string; name: string } | null
  evidence: { account_name: string; verbatim: string; source_type: WishlistSignalSource; date: string }[]
  generated_at: string
}

/** Config de handoff guardada em app_settings (chave 'wishlist_settings'). */
export interface WishlistSettings {
  handoff_endpoint: string | null
  handoff_secret_header: string | null
}
