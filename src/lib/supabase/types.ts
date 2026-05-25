export type AccountSegment = 'Indústria' | 'MRO' | 'Varejo' | 'Distribuidor'
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

export type SupportTicketMessage = {
  id: string
  ticket_id: string
  author_id: string
  author_email: string | null
  type: 'reply' | 'note'
  body: string
  created_at: string
  metadata: any
}

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
  country: string | null
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

export type CommercialGovernanceRuleType = 'discount' | 'penalty' | 'fidelity'
export type CommercialGovernanceSubType = 'progressive' | 'fixed' | 'percentage' | 'fidelity_penalty'

export type CommercialGovernance = {
  id: string
  account_id: string
  contract_id: string | null
  rule_type: CommercialGovernanceRuleType
  sub_type: CommercialGovernanceSubType
  label: string
  value: number
  config: {
    stages?: {
      label: string
      discount: number
      type: 'percentage' | 'fixed'
      starts_at?: string | null
      ends_at?: string | null
    }[]
  }
  is_active: boolean
  starts_at: string
  ends_at: string | null
  created_at: string
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
  urgency_score: 'high' | 'medium' | 'low' | null
  urgency_scored_at: string | null
  urgency_reasoning: any | null
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

export type HealthBreakdown = {
  sla: number        // 0-100: % tickets resolved on time in 30 days
  nps: number        // 0-100: normalized NPS score
  adoption: number   // 0-100: % features active
  relationship: number // 0-100: interaction frequency in 30 days
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
  health_score_v2?: number        // new: weighted score v2
  health_breakdown?: HealthBreakdown  // new: breakdown of 4 dimensions
  health_status?: 'healthy' | 'at-risk' | 'critical'  // new: classification
  health_classified_at?: string   // new: when status was last calculated
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
  commercial_governance: CommercialGovernance[]
}

// Support SLA Types
export type SLAPolicy = {
  id: string
  account_id: string | null
  contract_id: string | null
  is_global: boolean
  use_global_standard?: boolean
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

// Playbook Types
export type PlaybookTemplate = {
  id: string
  name: string
  description: string | null
  trigger_condition: string | null
  is_active: boolean
  created_at: string
  updated_at: string
  tasks?: PlaybookTask[]
}

export type PlaybookTask = {
  id: string
  template_id: string
  title: string
  description: string | null
  step_order: number
  task_type: 'manual' | 'email' | 'meeting' | 'review'
  action_payload: Record<string, any> | null
  created_at: string
  assigned_role?: 'csm' | 'manager' | 'ops' | null
  due_days_from_start?: number | null
  estimated_hours?: number | null
  feature_tags?: string[] | null
}

export type AccountPlaybook = {
  id: string
  account_id: string
  template_id: string
  status: 'in_progress' | 'completed' | 'cancelled'
  started_at: string
  completed_at: string | null
  csm_owner_id: string | null
  template?: PlaybookTemplate
  tasks?: AccountPlaybookTask[]
  expected_end_date?: string | null
  objective?: string | null
  success_criteria?: string | null
}

export type PlaybookComment = {
  author_id: string
  author_name: string
  text: string
  created_at: string
}

export type AccountPlaybookTask = {
  id: string
  account_playbook_id: string
  task_id: string
  status: 'pending' | 'completed' | 'skipped'
  completed_at: string | null
  notes: string | null
  created_at: string
  assigned_to?: string | null
  due_date?: string | null
  completed_by?: string | null
  comments?: PlaybookComment[] | null
  time_spent_hours?: number | null
}

// Proactive Alerts Types (F3-02)
export type AlertType =
  | 'churn_risk'
  | 'silent_customer'
  | 'renewal_upcoming'
  | 'adoption_anomaly'
  | 'expansion_signal'
  | 'nps_detractor_unactioned'
  | 'playbook_trigger'

export type AlertSeverity = 'critical' | 'warning' | 'info'

export type ProactiveAlert = {
  id: string
  account_id: string
  type: AlertType
  severity: AlertSeverity
  message: string
  metadata: Record<string, any>
  resolved_at: string | null
  created_at: string
  updated_at: string
}

export type AlertCheckResult = {
  type: AlertType
  severity: AlertSeverity
  message: string
  metadata: Record<string, any>
} | null

// Success Plans Types (F3-03)
export type SuccessPlanGoalStatus = 'pending' | 'ongoing' | 'completed' | 'delayed'

export type SuccessPlan = {
  id: string
  account_id: string
  title: string
  shared_token: string
  created_by: string
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SuccessPlanGoal = {
  id: string
  plan_id: string
  title: string
  description: string | null
  target_date: string | null
  status: SuccessPlanGoalStatus
  completed_at: string | null
  created_at: string
  updated_at: string
  deleted_at: string | null
}

export type SuccessPlanWithGoals = SuccessPlan & {
  goals: SuccessPlanGoal[]
}

// Auto Check-in Types (F4-15.1)
export type AutoCheckInQueueStatus = 'pending' | 'approved' | 'edited' | 'cancelled' | 'sent'

export type AutoCheckInQueueItem = {
  id: string
  account_id: string
  csm_id: string
  generated_subject: string
  generated_body: string
  status: AutoCheckInQueueStatus
  approval_deadline: string
  approved_at: string | null
  edited_subject: string | null
  edited_body: string | null
  sent_at: string | null
  created_at: string
  updated_at: string
}

// User Roles & Permissions (Epic 36)
export type UserRole = 'csm' | 'csm_senior' | 'head_cs' | 'admin' | 'super_admin'

export type Profile = {
  id: string
  full_name: string | null
  role: UserRole
  avatar_url: string | null
  created_at: string
  updated_at: string
}

// App Settings (Epic 37)
export type AppSetting = {
  key: string
  value: Record<string, any>
  description: string | null
  updated_by: string | null
  updated_at: string
}

// Audit Log
export type AuditLogEvent = 'role_changed' | 'setting_updated' | 'user_created'

export type AuditLog = {
  id: string
  event_type: AuditLogEvent
  user_id: string | null
  target_user_id: string | null
  changed_by: string | null
  old_value: string | null
  new_value: string | null
  metadata: Record<string, any>
  created_at: string
}

// Epic 16: Command Center
export type DailyHomePriorityCategory = 'focar_agora' | 'manter_momentum' | 'oportunidade'

export type DailyHomePriority = {
  id: string
  csm_id: string
  account_id: string
  category: DailyHomePriorityCategory
  reason: string
  score: number
  action_type: string | null
  created_at: string
}

export type DailyBriefingPriority = {
  title: string
  account_name: string
  action: string
  urgency: 'critical' | 'high' | 'medium'
}

export type DailyBriefing = {
  id: string
  csm_id: string
  date: string
  priorities: {
    priority_1?: DailyBriefingPriority
    priority_2?: DailyBriefingPriority
    priority_3?: DailyBriefingPriority
  }
  dismissed_at: string | null
  created_at: string
}

export type MeetingPrep = {
  id: string
  interaction_id: string
  account_id: string
  csm_id: string
  agenda: Record<string, any>
  key_questions: string[]
  attention_points: string[]
  edited_agenda: string | null
  created_at: string
  updated_at: string
}

// Epic 17: Renewal Cockpit
export type ContractNegotiationOutcome = 'renewed' | 'lost' | 'pending'

export type ContractNegotiationHistory = {
  id: string
  contract_id: string
  account_id: string
  date: string
  discount_offered_pct: number
  discount_accepted_pct: number
  main_objection: string | null
  closing_argument: string | null
  counterpart_name: string | null
  counterpart_role: string | null
  outcome: ContractNegotiationOutcome | null
  notes: string | null
  created_by: string | null
  created_at: string
  updated_at: string
}

// Renewal Documents (Epic 17, Story 17.2)
export type RenewalDocument = {
  id: string
  account_id: string
  contract_id: string | null
  csm_id: string
  pdf_url: string
  document_type: 'renewal_brief' | 'custom'
  generated_at: string
  created_at: string
  updated_at: string
}

// Interaction Themes (Epic 20, VoC Intelligence)
export type InteractionTheme = {
  id: string
  interaction_id: string
  theme: string
  created_at: string
}

// VoC Analysis Result (Epic 20)
export type VOCAnalysisResult = {
  sentiment_score: number // -1 to 1
  themes: string[]
  quotes: string[]
}

// Playbook Builder (Epic 23, Story 23.2)
export type PlaybookBlockType = 'action' | 'condition' | 'control'
export type PlaybookActionType = 'send_email' | 'create_task' | 'trigger_alert' | 'change_status'
export type PlaybookConditionType = 'health' | 'nps' | 'interaction_days' | 'custom'
export type PlaybookControlType = 'start' | 'end' | 'delay'

export type PlaybookBlock = {
  id: string
  type: PlaybookBlockType
  actionType?: PlaybookActionType
  conditionType?: PlaybookConditionType
  controlType?: PlaybookControlType
  config: Record<string, any>
  position?: { x: number; y: number }
}

export type PlaybookBuilderFlow = {
  blocks: PlaybookBlock[]
  edges: Array<{ from: string; to: string }>
}

// Adoption Intelligence (Epic 19)
export type AdoptionMetrics = {
  account_id: string
  week_date: string // ISO week start date
  adoption_score: number // 0-100
  active_features: string[]
  created_at: string
}

export type AdoptionDelta = {
  current: number // adoption score now
  previous: number // 6 months ago
  delta: number // percentage change
  trend: 'up' | 'down' | 'stable'
}

// CS Ops Intelligence (Epic 21)
export type CSMCapacity = {
  csm_id: string
  csm_name: string
  accounts_count: number
  ideal_capacity: number
  health_escalations: number
  avg_account_health: number
  workload_score: number // normalized 0-100
}

export type CSMScorecard = {
  csm_id: string
  period: string // YYYY-MM
  health_escalations_resolved_pct: number
  avg_csat: number | null
  avg_trt_minutes: number | null
  interactions_per_account: number
  revenue_retained: number
}

// Smart Alerts (Epic 22)
export type PredictiveChurnSignal = {
  account_id: string
  health_score: number
  days_below_threshold: number
  signal_type: 'churn_risk_predicted' | 'adoption_cliff' | 'contract_risk_critical'
  confidence: number // 0-1
}

export type { Database } from './database.types'

