export type AccountSegment = 'Indústria' | 'MRO' | 'Varejo'
export type HealthTrend = 'up' | 'stable' | 'down' | 'critical'
export type ContractStatus = 'active' | 'at-risk' | 'churned' | 'in-negotiation'
export type ServiceType = 'Basic' | 'Professional' | 'Enterprise' | 'Custom'
export type ContactSeniority = 'C-Level' | 'VP' | 'Director' | 'Manager' | 'IC'
export type ContactInfluence = 'Champion' | 'Neutral' | 'Detractor' | 'Blocker'
export type InteractionType = 'meeting' | 'email' | 'qbr' | 'onboarding' | 'health-check' | 'expansion' | 'churn-risk'
export type InteractionSource = 'readai' | 'manual' | 'csv'
export type ActivityType = 'preparation' | 'environment-analysis' | 'strategy' | 'reporting' | 'internal-meeting' | 'other'
export type TicketStatus = 'open' | 'in_progress' | 'resolved' | 'closed' | 'reopened'
export type TicketPriority = 'low' | 'medium' | 'high' | 'critical'
export type TicketSource = 'csv' | 'manual'

export type Account = {
  id: string
  name: string
  company_name: string | null
  segment: AccountSegment
  csm_owner_id: string
  sales_executive_id: string | null
  industry: string | null
  website: string | null
  address: string | null
  cep: string | null
  street: string | null
  number: string | null
  complement: string | null
  neighborhood: string | null
  city: string | null
  state: string | null
  is_international: boolean
  logo_url: string | null
  tax_id: string | null
  billing_day: number | null
  billing_rules: string | null
  billing_contact_name: string | null
  billing_contact_phone: string | null
  billing_contact_email: string | null
  health_score: number
  health_trend: HealthTrend
  discrepancy_alert: boolean
  created_at: string
}

export type DiscountType = 'percentage' | 'fixed'

export type Contract = {
  id: string
  account_id: string
  contract_code: string | null
  mrr: number
  arr: number
  start_date: string
  renewal_date: string
  service_type: ServiceType
  status: ContractStatus
  pricing_type: 'standard' | 'custom'
  pricing_explanation: string | null
  discount_percentage: number
  discount_duration_months: number
  discount_type: DiscountType
  discount_value_brl: number
  contracted_hours_monthly: number
  csm_hour_cost: number
  notes: string | null
  description: string | null
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
  phone: string | null
  linkedin_url: string | null
  photo_url: string | null
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
  external_priority_label: string | null
  internal_level: 'critical' | 'high' | 'medium' | 'low' | null
  sla_policy_id: string | null
  first_response_deadline: string | null
  first_response_attention_at: string | null
  resolution_deadline: string | null
  resolution_attention_at: string | null
  first_response_at: string | null
  closed_at: string | null
  assigned_to: string | null
  first_assigned_to: string | null
  parent_ticket_id: string | null
  pending_reason: 'client' | 'product' | 'none' | null
  sla_breach_first_response: boolean
  sla_breach_resolution: boolean
  sla_status_first_response: 'no_prazo'|'atencao'|'vencido'|'cumprido'|'violado' | null
  sla_status_resolution: 'no_prazo'|'atencao'|'vencido'|'cumprido'|'violado' | null
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
  classification: string | null
  created_by: string | null
  created_at: string | null
  source_type: string | null
}

// NPS Types
export type NPSQuestionType = 'nps_scale' | 'multiple_choice' | 'text'

export type NPSQuestion = {
  id: string
  program_id: string
  order_index: number
  type: NPSQuestionType
  title: string
  options: string[] | null   // usado em multiple_choice
  required: boolean
  created_at: string
}

export type NPSAnswer = {
  id: string
  response_id: string
  question_id: string
  text_value: string | null
  selected_options: string[] | null
  created_at: string
}

export type NPSProgram = {
  id: string
  account_id: string | null  // null = programa global (todos os clientes)
  csm_owner_id: string
  program_key: string
  question: string
  open_question: string
  tags: string[]
  recurrence_days: number
  dismiss_days: number
  account_recurrence_days: number
  is_active: boolean
  created_at: string
  updated_at: string
  questions?: NPSQuestion[]  // incluído quando carregado com join
}

export type NPSResponse = {
  id: string
  account_id: string
  program_key: string
  user_email: string
  user_id: string | null
  score: number | null
  comment: string | null
  tags: string[]
  dismissed: boolean
  dismissed_at: string | null
  responded_at: string | null
  created_at: string
}

export type NPSSegment = 'promoter' | 'passive' | 'detractor'

export function getNPSSegment(score: number): NPSSegment {
  if (score >= 9) return 'promoter'
  if (score >= 7) return 'passive'
  return 'detractor'
}

export type NPSStats = {
  total_responses: number
  avg_score: number
  nps_score: number // (promoters% - detractors%)
  promoters: number
  passives: number
  detractors: number
  responses: (NPSResponse & { account_name?: string })[]
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

// Support SLA Types
export type SLAPolicy = {
  id: string
  account_id: string | null
  contract_id: string | null
  is_global: boolean
  use_global_standard: boolean
  alert_threshold_pct: number
  auto_close_hours: number
  timezone: string
  is_active: boolean
  created_at: string
  updated_at: string
  levels?: SLAPolicyLevel[]
  mappings?: SLALevelMapping[]
}

export type SLAPolicyLevel = {
  id: string
  policy_id: string
  level: 'critical' | 'high' | 'medium' | 'low'
  first_response_minutes: number
  resolution_minutes: number
  created_at: string
  updated_at: string
}

export type SLALevelMapping = {
  id: string
  policy_id: string
  external_label: string
  internal_level: 'critical' | 'high' | 'medium' | 'low'
  created_at: string
}

export type BusinessHours = {
  id: string
  scope: 'global' | 'account'
  account_id: string | null
  dow: number
  start_time: string
  end_time: string
  is_active: boolean
  created_at: string
  updated_at: string
}

export type SLAEvent = {
  id: string
  ticket_id: string
  event_type: string
  occurred_at: string
  metadata: any | null
}

export type CSATResponse = {
  id: string
  ticket_id: string
  account_id: string
  score: number
  comment: string | null
  respondent_email: string
  answered_at: string
}

export type CSATToken = {
  id: string
  ticket_id: string
  token: string
  expires_at: string
  used_at: string | null
  email_delivery_failed: boolean
  created_at: string
}

export type Notification = {
  id: string
  user_id: string
  type: string
  message: string
  metadata: any | null
  read: boolean
  created_at: string
}

export type SupportSchedule = {
  id: string
  ticket_id: string
  created_by: string
  target_time: string
  reason: string
  completed_at: string | null
  created_at: string
}

export type Database = any
