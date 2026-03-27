export type AccountSegment = 'SMB' | 'Mid-Market' | 'Enterprise'
export type HealthTrend = 'up' | 'stable' | 'down' | 'critical'
export type ContractStatus = 'active' | 'at-risk' | 'churned' | 'in-negotiation'
export type ServiceType = 'Basic' | 'Professional' | 'Enterprise' | 'Custom'
export type ContactSeniority = 'C-Level' | 'VP' | 'Director' | 'Manager' | 'IC'
export type ContactInfluence = 'Champion' | 'Neutral' | 'Detractor' | 'Blocker'
export type InteractionType = 'meeting' | 'email' | 'qbr' | 'onboarding' | 'health-check' | 'expansion' | 'churn-risk'
export type InteractionSource = 'readai' | 'manual' | 'csv'
export type ActivityType = 'preparation' | 'environment-analysis' | 'strategy' | 'reporting' | 'internal-meeting' | 'other'
export type TicketStatus = 'open' | 'in-progress' | 'resolved' | 'closed'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketSource = 'csv' | 'manual'

export type Account = {
  id: string
  name: string
  segment: AccountSegment
  csm_owner_id: string
  industry: string | null
  website: string | null
  health_score: number
  health_trend: HealthTrend
  created_at: string
}

export type Contract = {
  id: string
  account_id: string
  mrr: number
  arr: number
  start_date: string
  renewal_date: string
  service_type: ServiceType
  status: ContractStatus
  contracted_hours_monthly: number
  csm_hour_cost: number
  notes: string | null
}

export type Contact = {
  id: string
  account_id: string
  name: string
  role: string
  seniority: ContactSeniority
  influence_level: ContactInfluence
  decision_maker: boolean
  email: string | null
  last_interaction_date: string | null
  notes: string | null
}

export type Interaction = {
  id: string
  account_id: string
  contract_id: string
  csm_id: string
  type: InteractionType
  title: string
  date: string
  direct_hours: number
  raw_transcript: string | null
  sentiment_score: number | null
  alert_triggered: boolean
  source: InteractionSource
  created_at: string
}

export type TimeEntry = {
  id: string
  account_id: string
  interaction_id: string | null
  csm_id: string
  activity_type: ActivityType
  natural_language_input: string
  parsed_hours: number
  parsed_description: string
  date: string
  logged_at: string
}

export type SupportTicket = {
  id: string
  account_id: string
  contract_id: string | null
  external_ticket_id: string | null
  title: string
  description: string
  status: TicketStatus
  priority: TicketPriority
  category: string | null
  opened_at: string
  resolved_at: string | null
  source: TicketSource
  csv_filename: string | null
  created_at: string
}

export type Embedding = {
  id: string
  account_id: string
  source_type: 'interaction' | 'support_ticket'
  source_id: string
  chunk_index: number
  chunk_text: string
  created_at: string
}

export type EmbeddingSearchResult = Embedding & {
  similarity: number
}

export type HealthScore = {
  id: string
  account_id: string
  evaluated_at: string
  manual_score: number | null
  manual_notes: string | null
  shadow_score: number | null
  shadow_reasoning: string | null
  sentiment_component: number | null
  ticket_component: number | null
  engagement_component: number | null
  discrepancy: number | null
  discrepancy_alert: boolean
}

// Joined types for UI
export type AccountWithContract = Account & {
  contracts: Contract[]
}

export type AccountDetail = Account & {
  contracts: Contract[]
  contacts: Contact[]
  interactions: Interaction[]
  support_tickets: SupportTicket[]
  latest_health_score: HealthScore | null
}

