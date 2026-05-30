import type { SupabaseClient } from '@supabase/supabase-js'
import { evalConditions, renderTemplate } from './context'
import { runAction, runHttp, runCode } from './actions'
import type { NodeConfig, RunContext, WorkflowEdge, WorkflowNode } from './types'

/**
 * Motor de execução durável dos Fluxos. Caminha o grafo passo a passo:
 * cada step processado executa o nó e enfileira os próximos. Nós de espera
 * (tarefa humana / aprovação / timer) deixam o run em `waiting` até um sinal.
 * Usa o admin client (service role) — chamado pelos crons.
 */

interface Graph { nodes: WorkflowNode[]; edges: WorkflowEdge[] }

async function loadGraph(admin: SupabaseClient, workflowId: string): Promise<Graph> {
  const [{ data: nodes }, { data: edges }] = await Promise.all([
    admin.from('workflow_nodes').select('node_id, node_type, label, config, position_x, position_y').eq('workflow_id', workflowId),
    admin.from('workflow_edges').select('source_node_id, target_node_id, edge_label').eq('workflow_id', workflowId),
  ])
  return { nodes: (nodes ?? []) as WorkflowNode[], edges: (edges ?? []) as WorkflowEdge[] }
}

async function loadAccountContext(admin: SupabaseClient, accountId: string | null): Promise<Record<string, any>> {
  if (!accountId) return {}
  const { data } = await admin.from('accounts').select('id, name, segment, health_score, csm_owner_id, account_status, journey_stage').eq('id', accountId).maybeSingle()
  return data ?? {}
}

function findNode(graph: Graph, nodeId: string): WorkflowNode | undefined {
  return graph.nodes.find(n => n.node_id === nodeId)
}

/** Cria os próximos steps a partir de um nó, seguindo as arestas que casam o label. */
async function advance(admin: SupabaseClient, runId: string, graph: Graph, fromNodeId: string, label: string, input: any): Promise<number> {
  const matches = graph.edges.filter(e => {
    if (e.source_node_id !== fromNodeId) return false
    if (label === 'default') return e.edge_label == null || e.edge_label === 'default'
    return e.edge_label === label
  })
  // fallback: se pediu um label específico e não há aresta, tenta o default
  const edges = matches.length > 0 ? matches
    : graph.edges.filter(e => e.source_node_id === fromNodeId && (e.edge_label == null || e.edge_label === 'default'))

  for (const e of edges) {
    const target = findNode(graph, e.target_node_id)
    if (!target) continue
    await admin.from('workflow_run_steps').insert({
      run_id: runId, node_id: target.node_id, node_type: target.node_type,
      status: 'pending', input_data: input ?? {},
    })
  }
  return edges.length
}

async function saveContext(admin: SupabaseClient, runId: string, ctx: RunContext) {
  await admin.from('workflow_runs').update({ context: ctx, updated_at: new Date().toISOString() }).eq('id', runId)
}

async function activeStepCount(admin: SupabaseClient, runId: string): Promise<number> {
  const { count } = await admin.from('workflow_run_steps').select('id', { count: 'exact', head: true })
    .eq('run_id', runId).in('status', ['pending', 'running', 'waiting'])
  return count ?? 0
}

async function finalizeIfDone(admin: SupabaseClient, runId: string) {
  if ((await activeStepCount(admin, runId)) === 0) {
    await admin.from('workflow_runs').update({ status: 'success', completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', runId)
  } else {
    await admin.from('workflow_runs').update({ status: 'running', updated_at: new Date().toISOString() }).eq('id', runId)
  }
}

async function failRun(admin: SupabaseClient, runId: string, error: string) {
  await admin.from('workflow_runs').update({ status: 'failed', error, completed_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', runId)
}

/** Cria um run e o primeiro step (nó trigger). */
export async function startRun(admin: SupabaseClient, opts: {
  workflowId: string; accountId: string | null; triggeredBy: 'event' | 'scheduled' | 'manual' | 'test';
  triggerData?: Record<string, any>; idempotencyKey?: string | null;
}): Promise<{ id: string } | null> {
  const graph = await loadGraph(admin, opts.workflowId)
  const trigger = graph.nodes.find(n => n.node_type === 'trigger')
  if (!trigger) return null

  const ctx: RunContext = {
    account: await loadAccountContext(admin, opts.accountId),
    trigger: opts.triggerData ?? {},
    steps: {}, loop: {},
  }

  const { data: run, error } = await admin.from('workflow_runs').insert({
    workflow_id: opts.workflowId, account_id: opts.accountId, triggered_by: opts.triggeredBy,
    status: 'running', context: ctx, trigger_data: opts.triggerData ?? {}, idempotency_key: opts.idempotencyKey ?? null,
  }).select('id').single()
  if (error || !run) return null

  await admin.from('workflow_run_steps').insert({
    run_id: run.id, node_id: trigger.node_id, node_type: 'trigger', status: 'pending', input_data: opts.triggerData ?? {},
  })
  return run
}

/** Processa um único step pronto (chamado pelo executor cron). */
export async function processStep(admin: SupabaseClient, stepId: string): Promise<void> {
  const { data: step } = await admin.from('workflow_run_steps').select('*').eq('id', stepId).maybeSingle()
  if (!step || !['pending'].includes(step.status)) return

  const { data: run } = await admin.from('workflow_runs').select('*').eq('id', step.run_id).maybeSingle()
  if (!run || !['running', 'waiting'].includes(run.status)) return

  const graph = await loadGraph(admin, run.workflow_id)
  const node = findNode(graph, step.node_id)
  if (!node) { await admin.from('workflow_run_steps').update({ status: 'skipped' }).eq('id', stepId); return }

  const cfg: NodeConfig = node.config ?? {}
  const ctx: RunContext = run.context ?? { steps: {}, loop: {} }
  ctx.steps = ctx.steps ?? {}; ctx.loop = ctx.loop ?? {}

  await admin.from('workflow_run_steps').update({ status: 'running', started_at: new Date().toISOString() }).eq('id', stepId)

  const done = async (output: any, advanceLabel = 'default') => {
    ctx.steps![node.node_id] = output
    await saveContext(admin, run.id, ctx)
    await admin.from('workflow_run_steps').update({ status: 'success', output_data: output ?? {}, completed_at: new Date().toISOString() }).eq('id', stepId)
    await advance(admin, run.id, graph, node.node_id, advanceLabel, output)
    await finalizeIfDone(admin, run.id)
  }
  const waitStep = async (reason: string, patch: Record<string, any>) => {
    await admin.from('workflow_run_steps').update({ status: 'waiting', wait_reason: reason, ...patch }).eq('id', stepId)
    await admin.from('workflow_runs').update({ status: 'waiting', updated_at: new Date().toISOString() }).eq('id', run.id)
  }

  try {
    switch (node.node_type) {
      case 'trigger':
        await done(run.trigger_data ?? {}); break

      case 'condition':
      case 'validation':
      case 'branch': {
        const ok = evalConditions(cfg.conditions, cfg.match ?? 'all', ctx)
        await done({ result: ok }, ok ? 'true' : 'false'); break
      }

      case 'switch': {
        const val = String(renderTemplate(cfg.switch_on ?? '', ctx))
        await done({ value: val }, `case:${val}`); break
      }

      case 'wait': {
        const delayMin = Number(cfg.execution?.delay_minutes ?? 0)
        if (delayMin > 0 && !step.next_run_at) {
          // 1ª passagem: agenda e volta a 'pending' (o executor re-processa quando next_run_at vencer)
          await admin.from('workflow_run_steps').update({
            status: 'pending', wait_reason: 'timer',
            next_run_at: new Date(Date.now() + delayMin * 60_000).toISOString(),
          }).eq('id', stepId)
          await admin.from('workflow_runs').update({ status: 'waiting', updated_at: new Date().toISOString() }).eq('id', run.id)
        } else {
          await done({ waited: true })
        }
        break
      }

      case 'human_task': {
        const csmId = ctx.account?.csm_owner_id ?? null
        const sla = cfg.execution?.sla_hours
        const { data: task } = await admin.from('csm_tasks').insert({
          account_id: run.account_id, csm_id: csmId,
          title: renderTemplate(cfg.task_title ?? 'Tarefa do fluxo', ctx),
          description: renderTemplate(cfg.task_description ?? '', ctx),
          priority: cfg.task_priority ?? 'medium', status: 'todo',
          source_label: 'workflow', workflow_run_step_id: stepId,
        }).select('id').single()
        await waitStep('human_task', {
          output_data: { task_id: task?.id },
          sla_due_at: sla ? new Date(Date.now() + sla * 3600_000).toISOString() : null,
        })
        break
      }

      case 'approval': {
        const sla = cfg.execution?.sla_hours
        const { data: appr } = await admin.from('workflow_approvals').insert({
          run_step_id: stepId, account_id: run.account_id, approver_role: cfg.approver_role ?? null,
          title: renderTemplate(cfg.approval_title ?? 'Aprovação', ctx),
          description: renderTemplate(cfg.task_description ?? '', ctx), status: 'pending',
        }).select('id').single()
        await waitStep('approval', {
          output_data: { approval_id: appr?.id },
          sla_due_at: sla ? new Date(Date.now() + sla * 3600_000).toISOString() : null,
        })
        break
      }

      case 'loop': {
        const state = (ctx.loop![node.node_id] ?? { count: 0 }) as { count: number; items?: any[]; index?: number }
        const max = Number(cfg.max_iterations ?? 10)
        if (cfg.loop_kind === 'for_each') {
          const items: any[] = state.items ?? (Array.isArray(renderTemplate(cfg.loop_items, ctx)) ? renderTemplate(cfg.loop_items, ctx) : [])
          const index = state.index ?? 0
          if (index < items.length && index < max) {
            ctx.loop![node.node_id] = { ...state, items, index: index + 1, current: items[index], count: index + 1 }
            await done({ index, current: items[index] }, 'loop')
          } else {
            await done({ finished: true, iterations: index }, 'done')
          }
        } else {
          // repeat_until: encerra quando a condição for verdadeira ou estourar max
          const reached = cfg.loop_condition ? evalConditions([cfg.loop_condition], 'all', ctx) : false
          const count = state.count ?? 0
          if (reached || count >= max) {
            await done({ finished: true, iterations: count, reached }, 'done')
          } else {
            ctx.loop![node.node_id] = { count: count + 1 }
            await done({ iteration: count + 1 }, 'loop')
          }
        }
        break
      }

      case 'action': {
        const out = await runAction(cfg, { admin, runId: run.id, accountId: run.account_id, ctx })
        await done(out); break
      }
      case 'http': {
        const out = await runHttp(cfg, ctx)
        await done(out); break
      }
      case 'code': {
        const out = runCode(cfg, ctx)
        await done(out); break
      }

      default:
        await done({ skipped: true }, 'default')
    }
  } catch (err: any) {
    const onError = cfg.execution?.on_error ?? 'fail'
    const maxRetries = Number(cfg.execution?.max_retries ?? 0)
    const msg = err?.message ?? String(err)
    if (onError === 'retry' && (step.retry_count ?? 0) < maxRetries) {
      const backoff = Math.min(60, 2 ** (step.retry_count ?? 0)) // minutos
      await admin.from('workflow_run_steps').update({
        status: 'pending', retry_count: (step.retry_count ?? 0) + 1,
        next_run_at: new Date(Date.now() + backoff * 60_000).toISOString(),
        logs: [...(step.logs ?? []), `retry: ${msg}`],
      }).eq('id', stepId)
    } else if (onError === 'skip') {
      await admin.from('workflow_run_steps').update({ status: 'skipped', error: msg }).eq('id', stepId)
      await advance(admin, run.id, graph, node.node_id, 'default', {})
      await finalizeIfDone(admin, run.id)
    } else {
      await admin.from('workflow_run_steps').update({ status: 'failed', error: msg, completed_at: new Date().toISOString() }).eq('id', stepId)
      await failRun(admin, run.id, `Nó ${node.node_id}: ${msg}`)
    }
  }
}

/** Retoma um step de tarefa humana ao concluir a tarefa (sinal do trigger no Postgres). */
export async function resumeHumanTask(admin: SupabaseClient, runStepId: string, taskStatus: string): Promise<void> {
  const { data: step } = await admin.from('workflow_run_steps').select('*').eq('id', runStepId).maybeSingle()
  if (!step || step.status !== 'waiting') return
  const { data: run } = await admin.from('workflow_runs').select('*').eq('id', step.run_id).maybeSingle()
  if (!run) return
  const graph = await loadGraph(admin, run.workflow_id)
  const ctx: RunContext = run.context ?? {}
  ctx.steps = ctx.steps ?? {}
  const output = { task_status: taskStatus, completed: taskStatus === 'completed' }
  ctx.steps[step.node_id] = output
  await saveContext(admin, run.id, ctx)
  await admin.from('workflow_run_steps').update({ status: 'success', output_data: output, completed_at: new Date().toISOString() }).eq('id', runStepId)
  await advance(admin, run.id, graph, step.node_id, taskStatus === 'completed' ? 'default' : 'timeout', output)
  await finalizeIfDone(admin, run.id)
}

/** Resolve um step de aprovação a partir da decisão. */
export async function resolveApproval(admin: SupabaseClient, runStepId: string, decision: 'approved' | 'rejected'): Promise<void> {
  const { data: step } = await admin.from('workflow_run_steps').select('*').eq('id', runStepId).maybeSingle()
  if (!step || step.status !== 'waiting') return
  const { data: run } = await admin.from('workflow_runs').select('*').eq('id', step.run_id).maybeSingle()
  if (!run) return
  const graph = await loadGraph(admin, run.workflow_id)
  const ctx: RunContext = run.context ?? {}
  ctx.steps = ctx.steps ?? {}
  ctx.steps[step.node_id] = { decision }
  await saveContext(admin, run.id, ctx)
  await admin.from('workflow_run_steps').update({ status: 'success', output_data: { decision }, completed_at: new Date().toISOString() }).eq('id', runStepId)
  await advance(admin, run.id, graph, step.node_id, decision, { decision })
  await finalizeIfDone(admin, run.id)
}
