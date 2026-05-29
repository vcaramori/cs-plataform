import type { SupabaseClient } from '@supabase/supabase-js'
import { startRun, processStep, resumeHumanTask } from './engine'

/**
 * Orquestração do motor (chamada pelos crons):
 *  - processEventQueue: eventos → instancia runs (com dedup) / retoma tarefas humanas
 *  - processScheduled: gatilhos agendados vencidos → instancia runs
 *  - runDueSteps: processa steps prontos (pending + next_run_at vencido)
 *  - handleSlaTimeouts: steps em espera além do SLA → caminho 'timeout'
 */

const WINDOW_MS = 3_600_000 // 1h

async function passesDedup(admin: SupabaseClient, workflowId: string, dedupKey: string, maxPerHour: number): Promise<boolean> {
  const { data } = await admin.from('workflow_dedup').select('*').eq('workflow_id', workflowId).eq('dedup_key', dedupKey).maybeSingle()
  const now = Date.now()
  if (!data) {
    await admin.from('workflow_dedup').insert({ workflow_id: workflowId, dedup_key: dedupKey, last_run_at: new Date().toISOString(), runs_in_window: 1 })
    return true
  }
  const within = now - new Date(data.last_run_at).getTime() < WINDOW_MS
  if (within && data.runs_in_window >= maxPerHour) return false
  await admin.from('workflow_dedup').update({
    last_run_at: new Date().toISOString(),
    runs_in_window: within ? data.runs_in_window + 1 : 1,
  }).eq('workflow_id', workflowId).eq('dedup_key', dedupKey)
  return true
}

export async function processEventQueue(admin: SupabaseClient, limit = 100): Promise<number> {
  const { data: events } = await admin.from('workflow_event_queue').select('*').is('processed_at', null).order('created_at').limit(limit)
  let handled = 0
  for (const ev of events ?? []) {
    try {
      if (ev.event_name === 'human_task_completed') {
        const stepId = ev.event_payload?.run_step_id
        if (stepId) await resumeHumanTask(admin, stepId, ev.event_payload?.task_status ?? 'completed')
      } else {
        const { data: triggers } = await admin.from('workflow_triggers')
          .select('workflow_id, max_runs_per_hour, workflow_definitions!inner(status, is_enabled)')
          .eq('event_name', ev.event_name).eq('mode', 'event').eq('is_enabled', true)
        for (const t of triggers ?? []) {
          const def = (t as any).workflow_definitions
          if (!def || def.status !== 'published' || !def.is_enabled) continue
          const dedupKey = `${ev.account_id ?? 'global'}:${ev.event_name}`
          if (!(await passesDedup(admin, t.workflow_id, dedupKey, t.max_runs_per_hour ?? 5))) continue
          await startRun(admin, {
            workflowId: t.workflow_id, accountId: ev.account_id ?? null, triggeredBy: 'event',
            triggerData: ev.event_payload ?? {}, idempotencyKey: `${t.workflow_id}:${dedupKey}:${ev.id}`,
          })
        }
      }
      await admin.from('workflow_event_queue').update({ processed_at: new Date().toISOString() }).eq('id', ev.id)
      handled++
    } catch (e: any) {
      await admin.from('workflow_event_queue').update({ attempts: (ev.attempts ?? 0) + 1, last_error: e?.message ?? String(e) }).eq('id', ev.id)
    }
  }
  return handled
}

export async function processScheduled(admin: SupabaseClient): Promise<number> {
  const nowIso = new Date().toISOString()
  const { data: triggers } = await admin.from('workflow_triggers')
    .select('id, workflow_id, filters, max_runs_per_hour, next_scheduled_at, workflow_definitions!inner(status, is_enabled)')
    .eq('mode', 'scheduled').eq('is_enabled', true).lte('next_scheduled_at', nowIso)
  let started = 0
  for (const t of triggers ?? []) {
    const def = (t as any).workflow_definitions
    if (!def || def.status !== 'published' || !def.is_enabled) continue
    // contas no escopo (filtro simples por segmento opcional)
    let q = admin.from('accounts').select('id')
    if (t.filters?.segment) q = q.eq('segment', t.filters.segment)
    const { data: accounts } = await q.limit(500)
    for (const a of accounts ?? []) {
      const dedupKey = `${a.id}:scheduled`
      if (!(await passesDedup(admin, t.workflow_id, dedupKey, t.max_runs_per_hour ?? 5))) continue
      await startRun(admin, { workflowId: t.workflow_id, accountId: a.id, triggeredBy: 'scheduled', triggerData: { scheduled_at: nowIso } })
      started++
    }
    // reagenda por intervalo (MVP: filters.interval_days, default 7)
    const days = Number(t.filters?.interval_days ?? 7)
    await admin.from('workflow_triggers').update({ next_scheduled_at: new Date(Date.now() + days * 86400_000).toISOString() }).eq('id', t.id)
  }
  return started
}

export async function runDueSteps(admin: SupabaseClient, limit = 200): Promise<number> {
  const nowIso = new Date().toISOString()
  const { data: steps } = await admin.from('workflow_run_steps').select('id, next_run_at')
    .eq('status', 'pending').or(`next_run_at.is.null,next_run_at.lte.${nowIso}`).limit(limit)
  let n = 0
  for (const s of steps ?? []) { await processStep(admin, s.id); n++ }
  return n
}

export async function handleSlaTimeouts(admin: SupabaseClient): Promise<number> {
  const nowIso = new Date().toISOString()
  const { data: steps } = await admin.from('workflow_run_steps').select('id')
    .eq('status', 'waiting').not('sla_due_at', 'is', null).lte('sla_due_at', nowIso).limit(100)
  let n = 0
  for (const s of steps ?? []) {
    // marca sucesso (com timeout) e segue pela aresta 'timeout' via resume
    await resumeHumanTask(admin, s.id, 'timeout')
    n++
  }
  return n
}
