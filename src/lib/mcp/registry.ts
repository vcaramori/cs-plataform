import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { env } from '@/lib/env'
import { runRAGPipeline, ingestOnboardingEvent, ingestNegotiation } from '@/lib/rag/rag-pipeline'
import { recomputeContractOnboarding, seedMilestonesForContract } from '@/lib/onboarding/onboarding-service'
import { logEffort } from '@/lib/effort/log-effort'

/**
 * Registry ÚNICO de tools do MCP da ferramenta (fonte da verdade).
 * Servido por dois transportes (HTTP /api/mcp e stdio mcp/stdio.ts) sem duplicar lógica.
 * Handlers são framework-agnósticos (admin client + libs; sem next/server).
 *
 * Política: leitura ampla; escrita restrita ao operacional (write:true).
 * NÃO há tools para usuários/perfis/config/admin nem exclusões (por design).
 *
 * Manter atualizado: ao adicionar uma capacidade de negócio, adicione/edite a tool aqui.
 */

// JSON Schema mínimo por tool (usado em tools/list).
type JsonSchema = { type: 'object'; properties: Record<string, any>; required?: string[] }

export type McpTool = {
  name: string
  description: string
  write: boolean
  inputSchema: JsonSchema
  handler: (args: Record<string, any>) => Promise<unknown>
}

const admin = () => getSupabaseAdminClient() as any
const RAG_ACTOR = 'mcp-agent' // rótulo p/ o pipeline RAG (não é FK)

/** Usuário real atribuído a lançamentos do agente (csm_id/FK). Override por acting_user_id. */
function actorUser(a: Record<string, any>): string {
  const id = (a.acting_user_id as string) || env.mcp.actorUserId
  if (!id) throw new Error('Defina MCP_ACTOR_USER_ID (ou passe acting_user_id) — necessário para atribuir o lançamento a um usuário real.')
  return id
}

function npsFromResponses(rows: { score: number | null }[]): { score: number; promoters: number; passives: number; detractors: number; total: number } {
  const scored = rows.filter((r) => r.score !== null) as { score: number }[]
  const total = scored.length
  if (total === 0) return { score: 0, promoters: 0, passives: 0, detractors: 0, total: 0 }
  const promoters = scored.filter((r) => r.score >= 9).length
  const detractors = scored.filter((r) => r.score <= 6).length
  const passives = total - promoters - detractors
  return { score: Math.round(((promoters - detractors) / total) * 100), promoters, passives, detractors, total }
}

export const MCP_TOOLS: McpTool[] = [
  // ───────────────────────── Leitura ─────────────────────────
  {
    name: 'ask',
    description: 'Pergunta em linguagem natural sobre uma conta ou o portfólio (motor RAG da plataforma). Use para diagnósticos, resumos e "o que está acontecendo".',
    write: false,
    inputSchema: { type: 'object', properties: { question: { type: 'string', description: 'A pergunta' }, account_id: { type: 'string', description: 'UUID da conta (opcional; omita para portfólio)' } }, required: ['question'] },
    handler: async (a) => runRAGPipeline(String(a.question), RAG_ACTOR, a.account_id ? String(a.account_id) : undefined),
  },
  {
    name: 'list_accounts',
    description: 'Lista contas (logos), com busca opcional por nome.',
    write: false,
    inputSchema: { type: 'object', properties: { search: { type: 'string' }, limit: { type: 'number' } } },
    handler: async (a) => {
      let q = admin().from('accounts').select('id, name, segment, health_score, health_trend, csm_owner_id').order('name').limit(Math.min(Number(a.limit) || 50, 200))
      if (a.search) q = q.ilike('name', `%${a.search}%`)
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data
    },
  },
  {
    name: 'get_account',
    description: 'Visão 360° de uma conta: dados, contratos (com status de onboarding), último health, NPS e contagem de tickets abertos.',
    write: false,
    inputSchema: { type: 'object', properties: { account_id: { type: 'string' } }, required: ['account_id'] },
    handler: async (a) => {
      const id = String(a.account_id)
      const db = admin()
      const [acc, contracts, health, nps, openTickets] = await Promise.all([
        db.from('accounts').select('*').eq('id', id).single(),
        db.from('contracts').select('id, description, contract_code, mrr, arr, status, renewal_date, onboarding_status, onboarding_current_stage, onboarding_health, onboarding_target_go_live').eq('account_id', id),
        db.from('health_scores').select('manual_score, shadow_score, classification, evaluated_at').eq('account_id', id).order('evaluated_at', { ascending: false }).limit(1),
        db.from('nps_responses').select('score').eq('account_id', id).not('score', 'is', null),
        db.from('support_tickets').select('id', { count: 'exact', head: true }).eq('account_id', id).in('status', ['open', 'in_progress', 'reopened']),
      ])
      return {
        account: acc.data,
        contracts: contracts.data ?? [],
        latest_health: health.data?.[0] ?? null,
        nps: npsFromResponses(nps.data ?? []),
        open_tickets: openTickets.count ?? 0,
      }
    },
  },
  {
    name: 'get_onboarding',
    description: 'Onboarding de um contrato: status, etapa atual, checklist (milestones) e diário (events).',
    write: false,
    inputSchema: { type: 'object', properties: { contract_id: { type: 'string' } }, required: ['contract_id'] },
    handler: async (a) => {
      const id = String(a.contract_id)
      const db = admin()
      const [contract, milestones, events] = await Promise.all([
        db.from('contracts').select('id, description, account_id, onboarding_status, onboarding_current_stage, onboarding_owner_id, onboarding_started_at, onboarding_target_go_live, onboarding_completed_at, onboarding_health, accounts(name)').eq('id', id).single(),
        db.from('onboarding_milestones').select('*').eq('contract_id', id).order('sort_order'),
        db.from('onboarding_events').select('id, event_type, title, description, date').eq('contract_id', id).order('date', { ascending: false }).limit(50),
      ])
      return { contract: contract.data, milestones: milestones.data ?? [], events: events.data ?? [] }
    },
  },
  {
    name: 'list_onboarding',
    description: 'Lista contratos em onboarding (status != not-started) com progresso do checklist.',
    write: false,
    inputSchema: { type: 'object', properties: {} },
    handler: async () => {
      const db = admin()
      const { data: contracts } = await db.from('contracts').select('id, description, account_id, onboarding_status, onboarding_current_stage, onboarding_health, onboarding_target_go_live, accounts(name)').neq('onboarding_status', 'not-started')
      const ids = (contracts ?? []).map((c: any) => c.id)
      const counts: Record<string, { done: number; total: number }> = {}
      if (ids.length) {
        const { data: ms } = await db.from('onboarding_milestones').select('contract_id, status').in('contract_id', ids)
        for (const m of ms ?? []) {
          const c = (counts[m.contract_id] ??= { done: 0, total: 0 })
          c.total++
          if (m.status === 'done' || m.status === 'skipped') c.done++
        }
      }
      return (contracts ?? []).map((c: any) => ({
        contract_id: c.id, contract: c.description, account: c.accounts?.name,
        status: c.onboarding_status, current_stage: c.onboarding_current_stage, health: c.onboarding_health,
        target_go_live: c.onboarding_target_go_live, progress: counts[c.id] ?? { done: 0, total: 0 },
      }))
    },
  },
  {
    name: 'get_nps',
    description: 'NPS de uma conta (ou do portfólio se account_id omitido): score e contagem de promotores/neutros/detratores.',
    write: false,
    inputSchema: { type: 'object', properties: { account_id: { type: 'string' } } },
    handler: async (a) => {
      let q = admin().from('nps_responses').select('score').not('score', 'is', null)
      if (a.account_id) q = q.eq('account_id', String(a.account_id))
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return npsFromResponses(data ?? [])
    },
  },
  {
    name: 'list_tickets',
    description: 'Lista tickets de suporte, com filtros opcionais por conta e status.',
    write: false,
    inputSchema: { type: 'object', properties: { account_id: { type: 'string' }, status: { type: 'string' }, limit: { type: 'number' } } },
    handler: async (a) => {
      let q = admin().from('support_tickets').select('id, title, status, priority, opened_at, account_id, accounts(name)').order('opened_at', { ascending: false }).limit(Math.min(Number(a.limit) || 50, 200))
      if (a.account_id) q = q.eq('account_id', String(a.account_id))
      if (a.status) q = q.eq('status', String(a.status))
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data
    },
  },
  {
    name: 'get_ticket',
    description: 'Detalhe de um ticket de suporte + mensagens.',
    write: false,
    inputSchema: { type: 'object', properties: { ticket_id: { type: 'string' } }, required: ['ticket_id'] },
    handler: async (a) => {
      const id = String(a.ticket_id)
      const db = admin()
      const [ticket, messages] = await Promise.all([
        db.from('support_tickets').select('*, accounts(name)').eq('id', id).single(),
        db.from('support_ticket_messages').select('*').eq('ticket_id', id).order('created_at'),
      ])
      return { ticket: ticket.data, messages: messages.data ?? [] }
    },
  },
  {
    name: 'list_effort',
    description: 'Lista lançamentos de esforço (time entries), filtrável por conta.',
    write: false,
    inputSchema: { type: 'object', properties: { account_id: { type: 'string' }, limit: { type: 'number' } } },
    handler: async (a) => {
      let q = admin().from('time_entries').select('id, activity_type, parsed_hours, parsed_description, date, account_id, psa_sync_status, accounts(name)').order('date', { ascending: false }).limit(Math.min(Number(a.limit) || 50, 200))
      if (a.account_id) q = q.eq('account_id', String(a.account_id))
      const { data, error } = await q
      if (error) throw new Error(error.message)
      return data
    },
  },

  // ───────────────────────── Escrita (operacional) ─────────────────────────
  {
    name: 'start_onboarding',
    description: 'Inicia o onboarding de um contrato: cria os marcos das etapas padrão e marca o contrato como "em andamento".',
    write: true,
    inputSchema: { type: 'object', properties: { contract_id: { type: 'string' }, owner_id: { type: 'string' }, target_go_live: { type: 'string', description: 'AAAA-MM-DD' } }, required: ['contract_id'] },
    handler: async (a) => {
      const db = admin()
      const contractId = String(a.contract_id)
      const { data: contract, error } = await db.from('contracts').select('id, account_id').eq('id', contractId).single()
      if (error || !contract) throw new Error('Contrato não encontrado')
      await seedMilestonesForContract(db, contractId, contract.account_id)
      const { data: firstStage } = await db.from('onboarding_stages').select('key').eq('is_active', true).order('sort_order').limit(1).single()
      await db.from('contracts').update({
        onboarding_status: 'in-progress',
        onboarding_started_at: new Date().toISOString(),
        onboarding_current_stage: firstStage?.key ?? null,
        onboarding_owner_id: a.owner_id ?? null,
        onboarding_target_go_live: a.target_go_live ?? null,
        onboarding_health: 'on-track',
      }).eq('id', contractId)
      const { data: ev } = await db.from('onboarding_events').insert({
        contract_id: contractId, account_id: contract.account_id, event_type: 'status_change',
        title: 'Onboarding iniciado (via agente)', created_by: null,
      }).select('id').single()
      if (ev?.id) { try { await ingestOnboardingEvent(ev.id) } catch { /* best-effort */ } }
      return { ok: true, contract_id: contractId }
    },
  },
  {
    name: 'update_onboarding_milestone',
    description: 'Atualiza o status de um marco de onboarding (pending|in-progress|done|skipped). Recalcula a etapa/status do contrato.',
    write: true,
    inputSchema: { type: 'object', properties: { milestone_id: { type: 'string' }, status: { type: 'string' }, notes: { type: 'string' } }, required: ['milestone_id', 'status'] },
    handler: async (a) => {
      const db = admin()
      const id = String(a.milestone_id)
      const { data: cur, error } = await db.from('onboarding_milestones').select('id, contract_id, account_id, stage_key, status').eq('id', id).single()
      if (error || !cur) throw new Error('Marco não encontrado')
      const patch: Record<string, unknown> = { status: a.status }
      if (a.status === 'done') patch.completed_date = new Date().toISOString().slice(0, 10)
      if (a.notes) patch.notes = a.notes
      await db.from('onboarding_milestones').update(patch).eq('id', id)
      const recompute = await recomputeContractOnboarding(db, cur.contract_id)
      const { data: ev } = await db.from('onboarding_events').insert({
        contract_id: cur.contract_id, account_id: cur.account_id, milestone_id: id, event_type: 'status_change',
        title: `Etapa "${cur.stage_key}" → ${a.status}`, description: a.notes ?? null, created_by: null,
      }).select('id').single()
      if (ev?.id) { try { await ingestOnboardingEvent(ev.id) } catch { /* best-effort */ } }
      return { ok: true, recompute }
    },
  },
  {
    name: 'log_onboarding_effort',
    description: 'Registra esforço de IMPLANTAÇÃO em um contrato (texto livre; horas/data lidas por IA). Marca como onboarding, entra no diário/RAG e é apontado no PSA.',
    write: true,
    inputSchema: { type: 'object', properties: { contract_id: { type: 'string' }, text: { type: 'string' }, user_email: { type: 'string', description: 'e-mail do profissional (usado no apontamento PSA)' }, acting_user_id: { type: 'string', description: 'UUID do usuário dono do lançamento (default MCP_ACTOR_USER_ID)' } }, required: ['contract_id', 'text', 'user_email'] },
    handler: async (a) => {
      const db = admin()
      const { data: contract, error } = await db.from('contracts').select('id, account_id').eq('id', String(a.contract_id)).single()
      if (error || !contract) throw new Error('Contrato não encontrado')
      const res = await logEffort({ userId: actorUser(a), userEmail: String(a.user_email), rawText: String(a.text), accountId: contract.account_id, onboardingContractId: String(a.contract_id) })
      return { ok: true, time_entry_id: res.timeEntry.id, hours: res.parsed.parsed_hours, psa: res.psa }
    },
  },
  {
    name: 'log_effort',
    description: 'Registra esforço de CS (não-onboarding) numa conta (texto livre; horas/data/atividade lidas por IA).',
    write: true,
    inputSchema: { type: 'object', properties: { account_id: { type: 'string' }, text: { type: 'string' }, acting_user_id: { type: 'string', description: 'UUID do usuário dono do lançamento (default MCP_ACTOR_USER_ID)' } }, required: ['account_id', 'text'] },
    handler: async (a) => {
      const res = await logEffort({ userId: actorUser(a), userEmail: '', rawText: String(a.text), accountId: String(a.account_id) })
      return { ok: true, time_entry_id: res.timeEntry.id, activity_type: res.timeEntry.activity_type, hours: res.parsed.parsed_hours }
    },
  },
  {
    name: 'add_onboarding_event',
    description: 'Adiciona uma nota/evento ao diário de onboarding de um contrato (entra na trilha RAG).',
    write: true,
    inputSchema: { type: 'object', properties: { contract_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, event_type: { type: 'string', description: 'note|meeting|blocker|decision (default note)' } }, required: ['contract_id', 'title'] },
    handler: async (a) => {
      const db = admin()
      const { data: contract, error } = await db.from('contracts').select('account_id').eq('id', String(a.contract_id)).single()
      if (error || !contract) throw new Error('Contrato não encontrado')
      const { data: ev, error: evErr } = await db.from('onboarding_events').insert({
        contract_id: String(a.contract_id), account_id: contract.account_id,
        event_type: a.event_type ?? 'note', title: String(a.title), description: a.description ?? null, created_by: null,
      }).select('id').single()
      if (evErr) throw new Error(evErr.message)
      try { await ingestOnboardingEvent(ev.id) } catch { /* best-effort */ }
      return { ok: true, event_id: ev.id }
    },
  },
  {
    name: 'create_ticket',
    description: 'Abre um ticket de suporte para uma conta.',
    write: true,
    inputSchema: { type: 'object', properties: { account_id: { type: 'string' }, title: { type: 'string' }, description: { type: 'string' }, priority: { type: 'string', description: 'low|medium|high|critical (default medium)' } }, required: ['account_id', 'title', 'description'] },
    handler: async (a) => {
      const { data, error } = await admin().from('support_tickets').insert({
        account_id: String(a.account_id), title: String(a.title), description: String(a.description),
        priority: a.priority ?? 'medium', source: 'manual', opened_at: new Date().toISOString(),
      }).select('id, status, priority').single()
      if (error) throw new Error(error.message)
      return { ok: true, ticket_id: data.id, status: data.status, priority: data.priority }
    },
  },
  {
    name: 'log_interaction',
    description: 'Registra uma interação com o cliente (reunião, e-mail, qbr, etc.) numa conta.',
    write: true,
    inputSchema: { type: 'object', properties: { account_id: { type: 'string' }, type: { type: 'string', description: 'meeting|email|qbr|onboarding|health-check|expansion|churn-risk' }, title: { type: 'string' }, date: { type: 'string', description: 'AAAA-MM-DD (default hoje)' }, notes: { type: 'string' }, hours: { type: 'number' }, acting_user_id: { type: 'string', description: 'UUID do CSM (default MCP_ACTOR_USER_ID)' } }, required: ['account_id', 'type', 'title'] },
    handler: async (a) => {
      const { data, error } = await admin().from('interactions').insert({
        account_id: String(a.account_id), csm_id: actorUser(a), type: String(a.type), title: String(a.title),
        date: a.date ?? new Date().toISOString().slice(0, 10), direct_hours: Number(a.hours) || 0,
        raw_transcript: a.notes ?? null, source: 'manual',
      }).select('id').single()
      if (error) throw new Error(error.message)
      return { ok: true, interaction_id: data.id }
    },
  },
  {
    name: 'register_negotiation',
    description: 'Registra um evento de negociação (venda inicial / renovação / renegociação) num contrato. Entra na trilha RAG de negociação.',
    write: true,
    inputSchema: { type: 'object', properties: { contract_id: { type: 'string' }, negotiation_type: { type: 'string', description: 'initial|renewal|renegotiation' }, outcome: { type: 'string', description: 'won|renewed|lost|pending' }, discount_offered_pct: { type: 'number' }, discount_accepted_pct: { type: 'number' }, main_objection: { type: 'string' }, closing_argument: { type: 'string' }, counterpart_name: { type: 'string' }, notes: { type: 'string' } }, required: ['contract_id', 'negotiation_type'] },
    handler: async (a) => {
      const db = admin()
      const { data: contract, error } = await db.from('contracts').select('account_id').eq('id', String(a.contract_id)).single()
      if (error || !contract) throw new Error('Contrato não encontrado')
      const { data: row, error: insErr } = await db.from('contract_negotiation_history').insert({
        contract_id: String(a.contract_id), account_id: contract.account_id,
        negotiation_type: a.negotiation_type, outcome: a.outcome ?? null,
        discount_offered_pct: Number(a.discount_offered_pct) || 0, discount_accepted_pct: Number(a.discount_accepted_pct) || 0,
        main_objection: a.main_objection ?? null, closing_argument: a.closing_argument ?? null,
        counterpart_name: a.counterpart_name ?? null, notes: a.notes ?? null, created_by: null,
      }).select('id').single()
      if (insErr) throw new Error(insErr.message)
      try { await ingestNegotiation(row.id) } catch { /* best-effort */ }
      return { ok: true, negotiation_id: row.id }
    },
  },
]

export function listToolsForMcp() {
  return MCP_TOOLS.map((t) => ({ name: t.name, description: t.description, inputSchema: t.inputSchema }))
}

export async function callMcpTool(name: string, args: Record<string, any>): Promise<unknown> {
  const tool = MCP_TOOLS.find((t) => t.name === name)
  if (!tool) throw new Error(`Tool desconhecida: ${name}`)
  // Validação mínima dos required do schema
  for (const req of tool.inputSchema.required ?? []) {
    if (args[req] === undefined || args[req] === null || args[req] === '') {
      throw new Error(`Parâmetro obrigatório ausente: ${req}`)
    }
  }
  return tool.handler(args ?? {})
}
