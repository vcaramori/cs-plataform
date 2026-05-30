/**
 * Biblioteca de Playbooks (templates) ongoing — grafos prontos para instanciar.
 * Cada template exercita condicionais + humano-no-loop + (loop/validação/ação).
 */

export interface TemplateNode {
  node_id: string
  node_type: string
  label: string
  position_x: number
  position_y: number
  config: Record<string, any>
}
export interface TemplateEdge {
  source_node_id: string
  target_node_id: string
  edge_label?: string
}
export interface WorkflowTemplate {
  key: string
  name: string
  description: string
  category: 'ongoing'
  icon: string
  nodes: TemplateNode[]
  edges: TemplateEdge[]
}

export const WORKFLOW_TEMPLATES: WorkflowTemplate[] = [
  {
    key: 'health_recovery',
    name: 'Recuperação de Health (crítico)',
    description: 'Quando o health cai abaixo de 40: alerta + diagnóstico humano com SLA, escalando se estourar o prazo.',
    category: 'ongoing', icon: 'HeartPulse',
    nodes: [
      { node_id: 'n1', node_type: 'trigger', label: 'Health mudou', position_x: 0, position_y: 120, config: { mode: 'event', event_name: 'health_score_changed' } },
      { node_id: 'n2', node_type: 'condition', label: 'Health < 40?', position_x: 260, position_y: 120, config: { match: 'all', conditions: [{ left: '{{trigger.new_score}}', op: '<', right: 40 }] } },
      { node_id: 'n3', node_type: 'action', label: 'Alerta crítico', position_x: 540, position_y: 40, config: { action_name: 'create_alert', alert_type: 'churn_risk', alert_severity: 'critical', message: 'Health crítico em {{account.name}} — intervir.' } },
      { node_id: 'n4', node_type: 'human_task', label: 'Diagnosticar e agir', position_x: 800, position_y: 40, config: { task_title: 'Diagnosticar health — {{account.name}}', task_priority: 'high', execution: { sla_hours: 48 } } },
      { node_id: 'n5', node_type: 'action', label: 'Acompanhar', position_x: 1060, position_y: 0, config: { action_name: 'create_task', task_title: 'Acompanhar recuperação — {{account.name}}', task_priority: 'medium' } },
      { node_id: 'n6', node_type: 'action', label: 'Escalar (SLA)', position_x: 1060, position_y: 140, config: { action_name: 'create_alert', alert_type: 'churn_risk', alert_severity: 'critical', message: 'Diagnóstico de {{account.name}} estourou o SLA — escalar.' } },
    ],
    edges: [
      { source_node_id: 'n1', target_node_id: 'n2' },
      { source_node_id: 'n2', target_node_id: 'n3', edge_label: 'true' },
      { source_node_id: 'n3', target_node_id: 'n4' },
      { source_node_id: 'n4', target_node_id: 'n5', edge_label: 'default' },
      { source_node_id: 'n4', target_node_id: 'n6', edge_label: 'timeout' },
    ],
  },
  {
    key: 'renewal_d90',
    name: 'Renovação D-90 (com aprovação)',
    description: 'Renovação se aproximando: CSM monta proposta, gestor aprova; se reprovar volta para revisão (loop); se aprovar, dispara envio.',
    category: 'ongoing', icon: 'CalendarClock',
    nodes: [
      { node_id: 'n1', node_type: 'trigger', label: 'Renovação próxima', position_x: 0, position_y: 120, config: { mode: 'event', event_name: 'contract_renewal_approaching' } },
      { node_id: 'n2', node_type: 'human_task', label: 'Montar proposta', position_x: 260, position_y: 120, config: { task_title: 'Montar proposta de renovação — {{account.name}}', task_priority: 'high', execution: { sla_hours: 72 } } },
      { node_id: 'n3', node_type: 'approval', label: 'Aprovar proposta', position_x: 540, position_y: 120, config: { approval_title: 'Aprovar proposta de renovação — {{account.name}}', approver_role: 'head_cs', execution: { sla_hours: 48 } } },
      { node_id: 'n4', node_type: 'action', label: 'Enviar ao cliente', position_x: 820, position_y: 60, config: { action_name: 'create_task', task_title: 'Enviar proposta ao cliente — {{account.name}}', task_priority: 'high' } },
      { node_id: 'n5', node_type: 'action', label: 'Escalar', position_x: 820, position_y: 200, config: { action_name: 'create_alert', alert_type: 'renewal_upcoming', alert_severity: 'warning', message: 'Aprovação da renovação de {{account.name}} estourou o SLA.' } },
    ],
    edges: [
      { source_node_id: 'n1', target_node_id: 'n2' },
      { source_node_id: 'n2', target_node_id: 'n3', edge_label: 'default' },
      { source_node_id: 'n3', target_node_id: 'n4', edge_label: 'approved' },
      { source_node_id: 'n3', target_node_id: 'n2', edge_label: 'rejected' },
      { source_node_id: 'n3', target_node_id: 'n5', edge_label: 'timeout' },
    ],
  },
  {
    key: 'adoption_recovery',
    name: 'Recuperação de Adoção',
    description: 'Feature regrediu: se bloqueada, alerta + diagnóstico; se parcial/não-iniciada, reforço de enablement.',
    category: 'ongoing', icon: 'Target',
    nodes: [
      { node_id: 'n1', node_type: 'trigger', label: 'Adoção regrediu', position_x: 0, position_y: 120, config: { mode: 'event', event_name: 'feature_adoption_changed' } },
      { node_id: 'n2', node_type: 'branch', label: 'Bloqueada?', position_x: 260, position_y: 120, config: { match: 'all', conditions: [{ left: '{{trigger.new_status}}', op: '==', right: 'blocked' }] } },
      { node_id: 'n3', node_type: 'action', label: 'Alerta de bloqueio', position_x: 540, position_y: 40, config: { action_name: 'create_alert', alert_type: 'adoption_anomaly', alert_severity: 'critical', message: 'Bloqueio de adoção em {{account.name}}.' } },
      { node_id: 'n4', node_type: 'human_task', label: 'Diagnosticar blocker', position_x: 800, position_y: 40, config: { task_title: 'Diagnosticar blocker de adoção — {{account.name}}', task_priority: 'high', execution: { sla_hours: 48 } } },
      { node_id: 'n5', node_type: 'action', label: 'Reforçar adoção', position_x: 540, position_y: 200, config: { action_name: 'create_task', task_title: 'Reforçar adoção — {{account.name}}', task_priority: 'medium' } },
    ],
    edges: [
      { source_node_id: 'n1', target_node_id: 'n2' },
      { source_node_id: 'n2', target_node_id: 'n3', edge_label: 'true' },
      { source_node_id: 'n3', target_node_id: 'n4' },
      { source_node_id: 'n2', target_node_id: 'n5', edge_label: 'false' },
    ],
  },
]
