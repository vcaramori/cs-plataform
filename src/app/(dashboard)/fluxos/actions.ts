'use server'

import { revalidatePath } from 'next/cache'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { startRun, resolveApproval } from '@/lib/workflows/engine'
import { runDueSteps } from '@/lib/workflows/triggers'
import { WORKFLOW_TEMPLATES } from '@/lib/workflows/templates'
import { NODE_CATALOG } from '@/lib/workflows/catalog'

async function requireUser() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Não autenticado')
  return { supabase, user }
}

export async function createWorkflow(name: string) {
  const { supabase, user } = await requireUser()
  const db = supabase as any
  const { data, error } = await db.from('workflow_definitions')
    .insert({ name: name?.trim() || 'Novo fluxo', created_by: user.id }).select('id').single()
  if (error) throw new Error(error.message)
  // gatilho inicial
  await db.from('workflow_nodes').insert({
    workflow_id: data.id, node_id: 'n1', node_type: 'trigger', label: 'Gatilho',
    position_x: 0, position_y: 120, config: NODE_CATALOG.trigger.defaults ?? {},
  })
  revalidatePath('/fluxos')
  return data.id as string
}

export async function createFromTemplate(templateKey: string) {
  const { supabase, user } = await requireUser()
  const tpl = WORKFLOW_TEMPLATES.find(t => t.key === templateKey)
  if (!tpl) throw new Error('Template não encontrado')
  const db = supabase as any
  const { data: def, error } = await db.from('workflow_definitions')
    .insert({ name: tpl.name, description: tpl.description, category: tpl.category, created_by: user.id })
    .select('id').single()
  if (error) throw new Error(error.message)
  await db.from('workflow_nodes').insert(tpl.nodes.map(n => ({
    workflow_id: def.id, node_id: n.node_id, node_type: n.node_type, label: n.label,
    position_x: n.position_x, position_y: n.position_y, config: n.config,
  })))
  await db.from('workflow_edges').insert(tpl.edges.map(e => ({
    workflow_id: def.id, source_node_id: e.source_node_id, target_node_id: e.target_node_id, edge_label: e.edge_label ?? null,
  })))
  revalidatePath('/fluxos')
  return def.id as string
}

export async function saveGraph(workflowId: string, payload: {
  name?: string; description?: string
  nodes: { node_id: string; node_type: string; label?: string | null; position_x: number; position_y: number; config: any }[]
  edges: { source_node_id: string; target_node_id: string; edge_label?: string | null }[]
}) {
  const { supabase } = await requireUser()
  const db = supabase as any
  if (payload.name !== undefined || payload.description !== undefined) {
    await db.from('workflow_definitions').update({
      ...(payload.name !== undefined ? { name: payload.name } : {}),
      ...(payload.description !== undefined ? { description: payload.description } : {}),
      updated_at: new Date().toISOString(),
    }).eq('id', workflowId)
  }
  await db.from('workflow_edges').delete().eq('workflow_id', workflowId)
  await db.from('workflow_nodes').delete().eq('workflow_id', workflowId)
  if (payload.nodes.length) {
    await db.from('workflow_nodes').insert(payload.nodes.map(n => ({ workflow_id: workflowId, ...n })))
  }
  if (payload.edges.length) {
    await db.from('workflow_edges').insert(payload.edges.map(e => ({ workflow_id: workflowId, ...e })))
  }
  revalidatePath(`/fluxos/${workflowId}`)
  return { ok: true }
}

/** Sincroniza workflow_triggers a partir do nó de gatilho. */
async function syncTriggers(db: any, workflowId: string, isEnabled: boolean) {
  const { data: trigger } = await db.from('workflow_nodes').select('config').eq('workflow_id', workflowId).eq('node_type', 'trigger').maybeSingle()
  await db.from('workflow_triggers').delete().eq('workflow_id', workflowId)
  if (!trigger) return
  const cfg = trigger.config ?? {}
  const mode = cfg.mode ?? 'event'
  await db.from('workflow_triggers').insert({
    workflow_id: workflowId, mode,
    event_name: mode === 'event' ? cfg.event_name : null,
    schedule_cron: mode === 'scheduled' ? (cfg.schedule_cron ?? null) : null,
    filters: { ...(cfg.segment ? { segment: cfg.segment } : {}), ...(cfg.interval_days ? { interval_days: Number(cfg.interval_days) } : {}) },
    max_runs_per_hour: Number(cfg.max_runs_per_hour ?? 5),
    is_enabled: isEnabled,
    next_scheduled_at: mode === 'scheduled' ? new Date().toISOString() : null,
  })
}

export async function publishWorkflow(workflowId: string) {
  const { supabase } = await requireUser()
  const db = supabase as any
  await db.from('workflow_definitions').update({ status: 'published', is_enabled: true, published_at: new Date().toISOString(), updated_at: new Date().toISOString() }).eq('id', workflowId)
  await syncTriggers(db, workflowId, true)
  revalidatePath('/fluxos'); revalidatePath(`/fluxos/${workflowId}`)
  return { ok: true }
}

export async function setEnabled(workflowId: string, enabled: boolean) {
  const { supabase } = await requireUser()
  const db = supabase as any
  await db.from('workflow_definitions').update({ is_enabled: enabled, updated_at: new Date().toISOString() }).eq('id', workflowId)
  await db.from('workflow_triggers').update({ is_enabled: enabled }).eq('workflow_id', workflowId)
  revalidatePath('/fluxos')
  return { ok: true }
}

export async function deleteWorkflow(workflowId: string) {
  const { supabase } = await requireUser()
  await (supabase as any).from('workflow_definitions').delete().eq('id', workflowId)
  revalidatePath('/fluxos')
  return { ok: true }
}

/** Executa o fluxo manualmente (teste) para uma conta e avança os steps imediatos. */
export async function runManual(workflowId: string, accountId: string | null) {
  await requireUser()
  const admin = getSupabaseAdminClient() as any
  const run = await startRun(admin, { workflowId, accountId, triggeredBy: 'test', triggerData: { manual: true } })
  if (!run) throw new Error('Fluxo sem nó de gatilho')
  // avança alguns ticks para processar steps imediatos (até ficar waiting/concluído)
  for (let i = 0; i < 12; i++) {
    const n = await runDueSteps(admin, 50)
    if (n === 0) break
  }
  revalidatePath(`/fluxos/${workflowId}`)
  return run.id as string
}

export async function decideApproval(approvalId: string, decision: 'approved' | 'rejected', comment?: string) {
  const { supabase, user } = await requireUser()
  const db = supabase as any
  const { data: appr } = await db.from('workflow_approvals').select('run_step_id, status').eq('id', approvalId).maybeSingle()
  if (!appr || appr.status !== 'pending') return { ok: false }
  await db.from('workflow_approvals').update({ status: decision, decided_by: user.id, decided_at: new Date().toISOString(), comment: comment ?? null }).eq('id', approvalId)
  const admin = getSupabaseAdminClient() as any
  await resolveApproval(admin, appr.run_step_id, decision)
  for (let i = 0; i < 12; i++) { const n = await runDueSteps(admin, 50); if (n === 0) break }
  revalidatePath('/fluxos')
  return { ok: true }
}
