/**
 * Tipos do módulo de Fluxos (orquestrador de processos de CS).
 * O grafo persiste em workflow_nodes/workflow_edges; a execução em
 * workflow_runs/workflow_run_steps. Ver docs/product/playbooks-plan.md.
 */

export type NodeType =
  | 'trigger'
  | 'condition'
  | 'validation'
  | 'branch'
  | 'switch'
  | 'loop'
  | 'wait'
  | 'human_task'
  | 'approval'
  | 'action'
  | 'http'
  | 'code'

export type RunStatus = 'running' | 'waiting' | 'success' | 'failed' | 'cancelled'
export type StepStatus = 'pending' | 'running' | 'waiting' | 'success' | 'failed' | 'skipped'
export type WaitReason = 'human_task' | 'approval' | 'timer' | 'http_callback' | 'loop'
export type TriggerMode = 'event' | 'scheduled' | 'manual'

export type CompareOp =
  | '==' | '!=' | '>' | '>=' | '<' | '<=' | 'contains' | 'in' | 'is_empty' | 'not_empty'

export interface Condition {
  left: string            // template, ex.: "{{trigger.new_score}}" ou "{{account.segment}}"
  op: CompareOp
  right?: any             // valor literal (template permitido)
}

/** Bloco "execution" comum — configurável por nó (diretriz do produto). */
export interface ExecutionConfig {
  on_error?: 'retry' | 'skip' | 'fail'    // default 'fail'
  max_retries?: number                     // default 0
  delay_minutes?: number                   // wait/atraso antes de executar
  sla_hours?: number                       // human_task/approval timeout
}

export interface NodeConfig {
  execution?: ExecutionConfig
  // condition/validation/branch
  match?: 'all' | 'any'
  conditions?: Condition[]
  // switch
  switch_on?: string
  // loop
  loop_kind?: 'for_each' | 'repeat_until'
  loop_items?: string          // template que resolve para array (for_each)
  loop_condition?: Condition   // repeat_until: encerra quando verdadeira
  max_iterations?: number      // guard-rail (default 10)
  // wait
  until_date?: string          // template/ISO
  // human_task
  task_title?: string
  task_description?: string
  task_priority?: 'low' | 'medium' | 'high'
  assigned_role?: string       // csm_owner | role
  // approval
  approval_title?: string
  approver_role?: string
  // action
  action_name?: 'create_task' | 'create_alert' | 'send_email' | 'update_field' | 'log_interaction'
  alert_type?: string
  alert_severity?: 'critical' | 'warning' | 'info'
  message?: string
  field?: string
  value?: any
  email_to?: string
  email_subject?: string
  email_body?: string
  note?: string
  // http
  http_method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE'
  http_url?: string
  http_headers?: Record<string, string>
  http_body?: string           // template (JSON string)
  // code (fast-follow)
  code_source?: string
  [k: string]: any
}

export interface WorkflowNode {
  node_id: string
  node_type: NodeType
  label?: string | null
  config: NodeConfig
  position_x?: number
  position_y?: number
}

export interface WorkflowEdge {
  source_node_id: string
  target_node_id: string
  edge_label?: string | null   // true|false|approved|rejected|timeout|case:*|default
}

export interface WorkflowGraph {
  nodes: WorkflowNode[]
  edges: WorkflowEdge[]
}

/** Contexto acumulado da execução, usado em templating/condições/payloads. */
export interface RunContext {
  account?: Record<string, any>
  trigger?: Record<string, any>
  steps?: Record<string, any>   // steps[node_id] = output
  loop?: Record<string, any>    // estado de loops por node_id
  [k: string]: any
}
