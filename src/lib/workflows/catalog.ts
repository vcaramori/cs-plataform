import type { NodeType } from './types'

/**
 * Catálogo de nós — dirige a paleta do builder e o painel de configuração.
 * Cada nó declara seu grupo, ícone (lucide), cor, arestas de saída e os campos
 * de configuração (form genérico). Mantém builder e engine alinhados.
 */

export type FieldType = 'text' | 'textarea' | 'number' | 'select' | 'conditions' | 'kv'

export interface FieldDef {
  key: string
  label: string
  type: FieldType
  options?: { value: string; label: string }[]
  placeholder?: string
  help?: string
}

export interface NodeDef {
  type: NodeType
  label: string
  group: 'Gatilho' | 'Condições' | 'Humano' | 'Ações' | 'Integração' | 'Controle'
  icon: string            // nome do ícone lucide
  color: string           // classe de cor (texto)
  accent: string          // classe de cor (bg) p/ a faixa do nó
  outputs: { id: string; label: string }[]   // arestas de saída (handles)
  fields: FieldDef[]
  defaults?: Record<string, any>
}

const EXECUTION_FIELDS: FieldDef[] = []

export const TRIGGER_EVENTS = [
  { value: 'health_score_changed', label: 'Health score mudou' },
  { value: 'nps_detractor_created', label: 'Detrator de NPS' },
  { value: 'contract_renewal_approaching', label: 'Renovação se aproximando' },
  { value: 'feature_adoption_changed', label: 'Adoção de feature regrediu' },
  { value: 'silent_customer', label: 'Cliente silencioso' },
  { value: 'ticket_escalated', label: 'Ticket escalado' },
  { value: 'interaction_logged', label: 'Interação registrada' },
]

export const NODE_CATALOG: Record<NodeType, NodeDef> = {
  trigger: {
    type: 'trigger', label: 'Gatilho', group: 'Gatilho', icon: 'Zap',
    color: 'text-amber-500', accent: 'bg-amber-500',
    outputs: [{ id: 'default', label: '' }],
    fields: [
      { key: 'mode', label: 'Tipo de gatilho', type: 'select', options: [
        { value: 'event', label: 'Por evento' }, { value: 'scheduled', label: 'Agendado' }, { value: 'manual', label: 'Manual' },
      ] },
      { key: 'event_name', label: 'Evento', type: 'select', options: TRIGGER_EVENTS },
      { key: 'interval_days', label: 'Intervalo (dias) — agendado', type: 'number', placeholder: '7' },
      { key: 'segment', label: 'Filtrar por segmento (opcional)', type: 'text' },
    ],
    defaults: { mode: 'event', event_name: 'health_score_changed', execution: {} },
  },
  condition: {
    type: 'condition', label: 'Condição', group: 'Condições', icon: 'GitBranch',
    color: 'text-plannera-ds', accent: 'bg-plannera-ds',
    outputs: [{ id: 'true', label: 'Verdadeiro' }, { id: 'false', label: 'Falso' }],
    fields: [
      { key: 'match', label: 'Combinar', type: 'select', options: [{ value: 'all', label: 'Todas (E)' }, { value: 'any', label: 'Qualquer (OU)' }] },
      { key: 'conditions', label: 'Condições', type: 'conditions' },
    ],
    defaults: { match: 'all', conditions: [], execution: {} },
  },
  validation: {
    type: 'validation', label: 'Validação', group: 'Condições', icon: 'ShieldCheck',
    color: 'text-plannera-sop', accent: 'bg-plannera-sop',
    outputs: [{ id: 'true', label: 'OK' }, { id: 'false', label: 'Falhou' }],
    fields: [
      { key: 'match', label: 'Combinar', type: 'select', options: [{ value: 'all', label: 'Todas (E)' }, { value: 'any', label: 'Qualquer (OU)' }] },
      { key: 'conditions', label: 'Regras', type: 'conditions' },
    ],
    defaults: { match: 'all', conditions: [], execution: {} },
  },
  branch: {
    type: 'branch', label: 'Ramificação (Se/Senão)', group: 'Controle', icon: 'Split',
    color: 'text-plannera-ds', accent: 'bg-plannera-ds',
    outputs: [{ id: 'true', label: 'Sim' }, { id: 'false', label: 'Não' }],
    fields: [
      { key: 'match', label: 'Combinar', type: 'select', options: [{ value: 'all', label: 'Todas (E)' }, { value: 'any', label: 'Qualquer (OU)' }] },
      { key: 'conditions', label: 'Condições', type: 'conditions' },
    ],
    defaults: { match: 'all', conditions: [], execution: {} },
  },
  switch: {
    type: 'switch', label: 'Switch', group: 'Controle', icon: 'ListTree',
    color: 'text-plannera-ds', accent: 'bg-plannera-ds',
    outputs: [{ id: 'default', label: 'Padrão' }],
    fields: [{ key: 'switch_on', label: 'Avaliar campo', type: 'text', placeholder: '{{account.segment}}' }],
    defaults: { switch_on: '', execution: {} },
  },
  loop: {
    type: 'loop', label: 'Loop', group: 'Controle', icon: 'Repeat',
    color: 'text-plannera-operations', accent: 'bg-plannera-operations',
    outputs: [{ id: 'loop', label: 'Iteração' }, { id: 'done', label: 'Fim' }],
    fields: [
      { key: 'loop_kind', label: 'Tipo', type: 'select', options: [{ value: 'repeat_until', label: 'Repetir até' }, { value: 'for_each', label: 'Para cada' }] },
      { key: 'loop_items', label: 'Lista (for_each)', type: 'text', placeholder: '{{steps.x.items}}' },
      { key: 'max_iterations', label: 'Máx. iterações', type: 'number', placeholder: '10' },
    ],
    defaults: { loop_kind: 'repeat_until', max_iterations: 10, execution: {} },
  },
  wait: {
    type: 'wait', label: 'Esperar', group: 'Controle', icon: 'Clock',
    color: 'text-content-secondary', accent: 'bg-content-secondary',
    outputs: [{ id: 'default', label: '' }],
    fields: [{ key: 'delay_minutes', label: 'Atraso (minutos)', type: 'number', placeholder: '1440 = 1 dia' }],
    defaults: { execution: { delay_minutes: 1440 } },
  },
  human_task: {
    type: 'human_task', label: 'Tarefa humana', group: 'Humano', icon: 'CheckCircle2',
    color: 'text-plannera-primary', accent: 'bg-plannera-primary',
    outputs: [{ id: 'default', label: 'Concluída' }, { id: 'timeout', label: 'SLA estourou' }],
    fields: [
      { key: 'task_title', label: 'Título da tarefa', type: 'text', placeholder: 'Ligar para {{account.name}}' },
      { key: 'task_description', label: 'Descrição', type: 'textarea' },
      { key: 'task_priority', label: 'Prioridade', type: 'select', options: [{ value: 'low', label: 'Baixa' }, { value: 'medium', label: 'Média' }, { value: 'high', label: 'Alta' }] },
      { key: 'sla_hours', label: 'SLA (horas)', type: 'number', placeholder: '48' },
    ],
    defaults: { task_priority: 'medium', execution: {} },
  },
  approval: {
    type: 'approval', label: 'Aprovação', group: 'Humano', icon: 'Stamp',
    color: 'text-plannera-soe', accent: 'bg-plannera-soe',
    outputs: [{ id: 'approved', label: 'Aprovado' }, { id: 'rejected', label: 'Rejeitado' }, { id: 'timeout', label: 'SLA estourou' }],
    fields: [
      { key: 'approval_title', label: 'Título', type: 'text', placeholder: 'Aprovar proposta de renovação' },
      { key: 'task_description', label: 'Detalhes', type: 'textarea' },
      { key: 'approver_role', label: 'Papel do aprovador', type: 'select', options: [
        { value: 'csm_senior', label: 'CS Sênior' }, { value: 'head_cs', label: 'Head de CS' }, { value: 'admin', label: 'Administrador' },
      ] },
      { key: 'sla_hours', label: 'SLA (horas)', type: 'number', placeholder: '48' },
    ],
    defaults: { execution: {} },
  },
  action: {
    type: 'action', label: 'Ação', group: 'Ações', icon: 'Wand2',
    color: 'text-success', accent: 'bg-success',
    outputs: [{ id: 'default', label: '' }],
    fields: [
      { key: 'action_name', label: 'Ação', type: 'select', options: [
        { value: 'create_task', label: 'Criar tarefa' }, { value: 'create_alert', label: 'Criar alerta' },
        { value: 'send_email', label: 'Enviar email' }, { value: 'update_field', label: 'Atualizar campo' },
        { value: 'log_interaction', label: 'Registrar interação' },
      ] },
      { key: 'task_title', label: 'Título (tarefa)', type: 'text' },
      { key: 'task_description', label: 'Descrição (tarefa)', type: 'textarea' },
      { key: 'message', label: 'Mensagem (alerta)', type: 'textarea' },
      { key: 'alert_type', label: 'Tipo de alerta', type: 'select', options: [
        { value: 'churn_risk', label: 'Risco de churn' }, { value: 'renewal_upcoming', label: 'Renovação próxima' },
        { value: 'adoption_anomaly', label: 'Anomalia de adoção' }, { value: 'expansion_signal', label: 'Sinal de expansão' },
        { value: 'nps_detractor_unactioned', label: 'Detrator sem ação' }, { value: 'silent_customer', label: 'Cliente silencioso' },
      ] },
      { key: 'alert_severity', label: 'Severidade', type: 'select', options: [{ value: 'critical', label: 'Crítico' }, { value: 'warning', label: 'Atenção' }, { value: 'info', label: 'Info' }] },
      { key: 'field', label: 'Campo (atualizar)', type: 'select', options: [
        { value: 'status', label: 'status' }, { value: 'segment', label: 'segment' }, { value: 'health_trend', label: 'health_trend' },
        { value: 'account_status', label: 'account_status' }, { value: 'journey_stage', label: 'journey_stage' }, { value: 'touch_model', label: 'touch_model' },
      ] },
      { key: 'value', label: 'Valor', type: 'text' },
      { key: 'email_to', label: 'Email para', type: 'text' },
      { key: 'email_subject', label: 'Assunto', type: 'text' },
      { key: 'email_body', label: 'Corpo', type: 'textarea' },
      { key: 'note', label: 'Nota (interação)', type: 'textarea' },
    ],
    defaults: { action_name: 'create_task', execution: {} },
  },
  http: {
    type: 'http', label: 'HTTP / Webhook', group: 'Integração', icon: 'Globe',
    color: 'text-plannera-sop', accent: 'bg-plannera-sop',
    outputs: [{ id: 'default', label: '' }],
    fields: [
      { key: 'http_method', label: 'Método', type: 'select', options: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE'].map(m => ({ value: m, label: m })) },
      { key: 'http_url', label: 'URL (https)', type: 'text', placeholder: 'https://...' },
      { key: 'http_headers', label: 'Headers', type: 'kv' },
      { key: 'http_body', label: 'Corpo (JSON, template)', type: 'textarea' },
    ],
    defaults: { http_method: 'POST', execution: {} },
  },
  code: {
    type: 'code', label: 'Código (sandbox)', group: 'Integração', icon: 'Code',
    color: 'text-plannera-ds', accent: 'bg-plannera-ds',
    outputs: [{ id: 'default', label: '' }],
    fields: [{ key: 'code_source', label: 'Código JS', type: 'textarea', help: 'Recebe `context` e deve setar `result`. Ex.: result = context.account.health_score * 2' }],
    defaults: { execution: {} },
  },
}

/** Campos comuns de "Execução" (retry/on_error) mostrados para nós de ação/integração. */
export const EXECUTION_FIELD_DEFS: FieldDef[] = [
  { key: 'on_error', label: 'Em caso de erro', type: 'select', options: [
    { value: 'fail', label: 'Falhar o fluxo' }, { value: 'retry', label: 'Tentar novamente' }, { value: 'skip', label: 'Pular' },
  ] },
  { key: 'max_retries', label: 'Máx. tentativas', type: 'number', placeholder: '0' },
]

export const NODE_GROUPS: NodeDef['group'][] = ['Gatilho', 'Condições', 'Humano', 'Ações', 'Integração', 'Controle']

export const CONDITION_OPS = [
  { value: '==', label: '=' }, { value: '!=', label: '≠' }, { value: '>', label: '>' }, { value: '>=', label: '≥' },
  { value: '<', label: '<' }, { value: '<=', label: '≤' }, { value: 'contains', label: 'contém' },
  { value: 'in', label: 'em' }, { value: 'is_empty', label: 'vazio' }, { value: 'not_empty', label: 'preenchido' },
]

void EXECUTION_FIELDS
