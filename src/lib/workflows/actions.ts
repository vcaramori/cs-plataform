import vm from 'node:vm'
import type { SupabaseClient } from '@supabase/supabase-js'
import { renderTemplate } from './context'
import type { NodeConfig, RunContext } from './types'

interface ActionEnv {
  admin: SupabaseClient
  runId: string
  accountId: string | null
  ctx: RunContext
}

const ALERT_TYPES = ['churn_risk', 'silent_customer', 'renewal_upcoming', 'adoption_anomaly', 'expansion_signal', 'nps_detractor_unactioned']
const ALERT_SEVERITIES = ['critical', 'warning', 'info']
const UPDATABLE_FIELDS = ['status', 'segment', 'health_trend', 'account_status', 'journey_stage', 'touch_model']

function addHoursISO(h: number) {
  return new Date(Date.now() + h * 3600_000).toISOString()
}

/** Ações da ferramenta executadas por nós do tipo action/http. Retorna o output (vai p/ context.steps[node_id]). */
export async function runAction(cfg: NodeConfig, env: ActionEnv): Promise<Record<string, any>> {
  const { admin, runId, accountId, ctx } = env

  switch (cfg.action_name) {
    case 'create_task': {
      // CSM dono da conta (assigned_role=csm_owner) — fallback ao criador do run
      const csmId = ctx.account?.csm_owner_id ?? null
      const dueDays = Number(cfg.value ?? cfg.execution?.delay_minutes ?? 1)
      const due = new Date(Date.now() + (Number.isFinite(dueDays) ? dueDays : 1) * 86400_000)
      const { data, error } = await admin.from('csm_tasks').insert({
        account_id: accountId,
        csm_id: csmId,
        title: renderTemplate(cfg.task_title ?? cfg.message ?? 'Tarefa do fluxo', ctx),
        description: renderTemplate(cfg.task_description ?? '', ctx),
        priority: cfg.task_priority ?? 'medium',
        status: 'todo',
        due_date: due.toISOString().slice(0, 10),
        source_label: 'workflow',
      }).select('id').single()
      if (error) throw new Error(`create_task: ${error.message}`)
      return { task_id: data.id, status: 'created' }
    }

    case 'create_alert': {
      const type = ALERT_TYPES.includes(String(cfg.alert_type)) ? cfg.alert_type : 'churn_risk'
      const severity = ALERT_SEVERITIES.includes(String(cfg.alert_severity)) ? cfg.alert_severity : 'warning'
      const { data, error } = await admin.from('proactive_alerts').insert({
        account_id: accountId,
        type,
        severity,
        message: renderTemplate(cfg.message ?? 'Alerta gerado por fluxo', ctx),
        metadata: { source: 'workflow', run_id: runId },
      }).select('id').single()
      if (error) throw new Error(`create_alert: ${error.message}`)
      return { alert_id: data.id, status: 'created' }
    }

    case 'update_field': {
      const field = String(cfg.field ?? '')
      if (!UPDATABLE_FIELDS.includes(field)) throw new Error(`update_field: campo '${field}' não permitido`)
      const value = renderTemplate(cfg.value, ctx)
      const { error } = await admin.from('accounts').update({ [field]: value }).eq('id', accountId)
      if (error) throw new Error(`update_field: ${error.message}`)
      return { field, value, status: 'updated' }
    }

    case 'log_interaction': {
      const csmId = ctx.account?.csm_owner_id ?? null
      const { data, error } = await admin.from('interactions').insert({
        account_id: accountId,
        csm_id: csmId,
        type: 'health-check',
        title: renderTemplate(cfg.note ?? cfg.message ?? 'Registro do fluxo', ctx),
        date: new Date().toISOString().slice(0, 10),
        source: 'workflow',
      }).select('id').single()
      if (error) throw new Error(`log_interaction: ${error.message}`)
      return { interaction_id: data.id, status: 'logged' }
    }

    case 'send_email': {
      // MVP: registra a intenção; o envio real (SMTP) será conectado em seguida.
      return {
        status: 'queued',
        to: renderTemplate(cfg.email_to ?? '', ctx),
        subject: renderTemplate(cfg.email_subject ?? '', ctx),
        note: 'email enfileirado (wiring SMTP pendente)',
      }
    }

    default:
      throw new Error(`Ação desconhecida: ${cfg.action_name}`)
  }
}

/** Nó HTTP: chama API externa (allowlist https, timeout) e devolve status/resposta para o context. */
export async function runHttp(cfg: NodeConfig, ctx: RunContext): Promise<Record<string, any>> {
  const url = renderTemplate(cfg.http_url ?? '', ctx)
  if (!/^https:\/\//i.test(url)) throw new Error('http: apenas URLs https são permitidas')
  if (/(localhost|127\.0\.0\.1|169\.254|10\.|192\.168\.|::1)/i.test(url)) throw new Error('http: host privado bloqueado')

  const method = (cfg.http_method ?? 'GET').toUpperCase()
  const headers: Record<string, string> = { 'Content-Type': 'application/json', ...(cfg.http_headers ?? {}) }
  const bodyTemplate = cfg.http_body ? renderTemplate(cfg.http_body, ctx) : undefined

  const ctrl = new AbortController()
  const timeout = setTimeout(() => ctrl.abort(), 10_000)
  try {
    const res = await fetch(url, {
      method,
      headers,
      body: method === 'GET' || method === 'DELETE' ? undefined : (typeof bodyTemplate === 'string' ? bodyTemplate : JSON.stringify(bodyTemplate)),
      signal: ctrl.signal,
    })
    let parsed: any = null
    const text = await res.text()
    try { parsed = JSON.parse(text) } catch { parsed = text }
    return { status_code: res.status, ok: res.ok, response: parsed }
  } finally {
    clearTimeout(timeout)
  }
}

/**
 * Nó de código: executa um script curto num contexto isolado (node:vm).
 * O script recebe `context` (clone) e deve setar `result`. Sem acesso a
 * require/process/rede (não expostos no sandbox). Timeout de 2s.
 * Obs.: vm não é um isolamento de segurança forte — uso restrito a fluxos
 * autorados internamente; evolução: isolated-vm/worker dedicado.
 */
export function runCode(cfg: NodeConfig, ctx: RunContext): Record<string, any> {
  const source = String(cfg.code_source ?? '').trim()
  if (!source) return { result: null }
  const sandbox: Record<string, any> = {
    context: JSON.parse(JSON.stringify(ctx ?? {})),
    result: undefined,
    JSON, Math,
  }
  vm.createContext(sandbox)
  vm.runInContext(`"use strict";\n${source}`, sandbox, { timeout: 2000 })
  return { result: sandbox.result ?? null }
}

export { addHoursISO }
