import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserAccessScope, getModulePermission } from '@/lib/auth/get-module-permission'
import { seedMilestonesForContract, seedMilestonesFromTemplate } from '@/lib/onboarding/onboarding-service'
import { ingestOnboardingEvent } from '@/lib/rag/rag-pipeline'

const StartSchema = z.object({
  contract_id: z.string().uuid(),
  template_id: z.string().uuid().nullable().optional(),
  start_date: z.string().nullable().optional(), // 'YYYY-MM-DD'; default hoje
  owner_id: z.string().uuid().nullable().optional(),
  target_go_live: z.string().nullable().optional(),
})

function contractLabel(c: any): string {
  return c?.description || c?.contract_code || 'Contrato'
}

// GET /api/onboarding            -> lista agregada (dashboard)
// GET /api/onboarding?contract_id=… -> detalhe (milestones + etapas) p/ a conta
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient() as any
  const { searchParams } = new URL(request.url)
  const contractId = searchParams.get('contract_id')

  // ----- Contratos candidatos a iniciar onboarding (p/ o fluxo central) -----
  if (searchParams.get('candidates')) {
    const scope = await getUserAccessScope(user.id, 'onboarding')
    let q = admin
      .from('contracts')
      .select('id, description, contract_code, account_id, accounts!inner(name, csm_owner_id)')
      .eq('onboarding_status', 'not-started')
      .order('start_date', { ascending: false })
      .limit(500)
    if (scope !== 'global') q = q.eq('accounts.csm_owner_id', user.id)
    const { data, error } = await q
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json((data ?? []).map((c: any) => ({
      contract_id: c.id,
      contract_label: contractLabel(c),
      account_id: c.account_id,
      account_name: (Array.isArray(c.accounts) ? c.accounts[0]?.name : c.accounts?.name) ?? 'Conta',
    })))
  }

  // Catálogo de etapas (legado) + biblioteca de templates (p/ iniciar projeto)
  const [{ data: stages }, { data: templates }] = await Promise.all([
    admin.from('onboarding_stages').select('key, label, sort_order').eq('is_active', true).order('sort_order'),
    admin.from('onboarding_templates').select('id, name, description, project_type').eq('is_active', true).order('name'),
  ])

  // ----- Detalhe de um contrato -----
  if (contractId) {
    const { data: contract } = await admin
      .from('contracts')
      .select('id, description, contract_code, account_id, onboarding_status, onboarding_current_stage, onboarding_owner_id, onboarding_started_at, onboarding_target_go_live, onboarding_completed_at, onboarding_health, onboarding_template_id, accounts(name)')
      .eq('id', contractId)
      .single()
    const { data: milestones } = await admin
      .from('onboarding_milestones')
      .select('*')
      .eq('contract_id', contractId)
      .order('sort_order')
    return NextResponse.json({ stages: stages ?? [], templates: templates ?? [], contract, milestones: milestones ?? [] })
  }

  // ----- Lista agregada (dashboard gerencial) -----
  const scope = await getUserAccessScope(user.id, 'onboarding')

  let cq = admin
    .from('contracts')
    .select('id, description, contract_code, account_id, onboarding_status, onboarding_current_stage, onboarding_owner_id, onboarding_started_at, onboarding_target_go_live, onboarding_completed_at, onboarding_health, accounts!inner(name, csm_owner_id)')
    .neq('onboarding_status', 'not-started')
  if (scope !== 'global') cq = cq.eq('accounts.csm_owner_id', user.id)
  const { data: contracts, error } = await cq
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const list = contracts ?? []
  const contractIds = list.map((c: any) => c.id)

  // Milestones de todos os contratos em onboarding
  let milestonesByContract: Record<string, any[]> = {}
  if (contractIds.length > 0) {
    const { data: ms } = await admin
      .from('onboarding_milestones')
      .select('contract_id, name, stage_key, status, sort_order, planned_date, completed_date')
      .in('contract_id', contractIds)
      .order('sort_order')
    for (const m of ms ?? []) {
      ;(milestonesByContract[m.contract_id] ??= []).push(m)
    }
  }

  // Nomes dos responsáveis de onboarding
  const ownerIds = [...new Set(list.map((c: any) => c.onboarding_owner_id).filter(Boolean))]
  let ownerNames: Record<string, string> = {}
  if (ownerIds.length > 0) {
    const { data: profiles } = await admin.from('profiles').select('id, full_name').in('id', ownerIds)
    for (const p of profiles ?? []) ownerNames[p.id] = p.full_name ?? ''
  }

  const now = Date.now()
  const items = list.map((c: any) => {
    const ms = milestonesByContract[c.id] ?? []
    const total = ms.length
    const done = ms.filter((m) => m.status === 'done' || m.status === 'skipped').length
    const startedAt = c.onboarding_started_at ? new Date(c.onboarding_started_at).getTime() : null
    const days_in_onboarding = startedAt ? Math.floor((now - startedAt) / 86400000) : null
    const nextMs = ms.find((m) => m.status !== 'done' && m.status !== 'skipped')
    return {
      contract_id: c.id,
      contract_label: contractLabel(c),
      account_id: c.account_id,
      account_name: (Array.isArray(c.accounts) ? c.accounts[0]?.name : c.accounts?.name) ?? 'Conta',
      onboarding_status: c.onboarding_status,
      onboarding_current_stage: c.onboarding_current_stage,
      onboarding_health: c.onboarding_health,
      onboarding_owner_id: c.onboarding_owner_id,
      owner_name: c.onboarding_owner_id ? (ownerNames[c.onboarding_owner_id] ?? '') : '',
      started_at: c.onboarding_started_at,
      target_go_live: c.onboarding_target_go_live,
      completed_at: c.onboarding_completed_at,
      next_milestone: nextMs ? { name: nextMs.name ?? nextMs.stage_key, planned_date: nextMs.planned_date } : null,
      progress: { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 },
    }
  })

  return NextResponse.json({ stages: stages ?? [], templates: templates ?? [], items })
}

// POST /api/onboarding  -> inicia o onboarding de um contrato
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await getModulePermission(user.id, 'onboarding', 'create'))) {
    return NextResponse.json({ error: 'Sem permissão para iniciar onboarding' }, { status: 403 })
  }

  const parsed = StartSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { contract_id, template_id, start_date, owner_id, target_go_live } = parsed.data
  const startDate = (start_date && start_date.slice(0, 10)) || new Date().toISOString().slice(0, 10)

  const admin = getSupabaseAdminClient() as any

  const { data: contract, error: cErr } = await admin
    .from('contracts')
    .select('id, account_id, onboarding_status, description')
    .eq('id', contract_id)
    .single()
  if (cErr || !contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  // 1. Cria os marcos: a partir de um TEMPLATE (datas calculadas) ou do catálogo legado.
  let firstName: string | null = null
  let templateName: string | null = null
  if (template_id) {
    const { data: tpl } = await admin.from('onboarding_templates').select('name').eq('id', template_id).single()
    templateName = tpl?.name ?? null
    const seeded = await seedMilestonesFromTemplate(admin, contract_id, contract.account_id, template_id, startDate)
    firstName = seeded.firstName
  } else {
    await seedMilestonesForContract(admin, contract_id, contract.account_id)
    const { data: first } = await admin
      .from('onboarding_milestones').select('name').eq('contract_id', contract_id).order('sort_order').limit(1).single()
    firstName = first?.name ?? null
  }

  // 2. Marca o contrato em onboarding
  const { error: upErr } = await admin
    .from('contracts')
    .update({
      onboarding_status: 'in-progress',
      onboarding_started_at: `${startDate}T00:00:00Z`,
      onboarding_current_stage: firstName,
      onboarding_owner_id: owner_id ?? null,
      onboarding_target_go_live: target_go_live ?? null,
      onboarding_health: 'on-track',
      onboarding_template_id: template_id ?? null,
    })
    .eq('id', contract_id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // 3. Evento de início + ingestão no RAG
  const { data: ev } = await admin
    .from('onboarding_events')
    .insert({
      contract_id,
      account_id: contract.account_id,
      event_type: 'status_change',
      title: 'Onboarding iniciado',
      description: templateName ? `Cronograma criado a partir do template "${templateName}" (início ${startDate}).` : 'Cronograma de onboarding criado.',
      created_by: user.id,
    })
    .select('id')
    .single()
  if (ev?.id) { try { await ingestOnboardingEvent(ev.id) } catch { /* ingest best-effort */ } }

  return NextResponse.json({ ok: true, contract_id }, { status: 201 })
}

const HeaderPatchSchema = z.object({
  contract_id: z.string().uuid(),
  owner_id: z.string().uuid().nullable().optional(),
  target_go_live: z.string().nullable().optional(),
  onboarding_health: z.enum(['on-track', 'at-risk', 'stalled']).optional(),
  onboarding_status: z.enum(['not-started', 'in-progress', 'on-hold', 'completed', 'cancelled']).optional(),
})

// PATCH /api/onboarding — atualiza o cabeçalho do onboarding do contrato
// (responsável, go-live, saúde, status). Não mexe nos marcos.
export async function PATCH(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getModulePermission(user.id, 'onboarding', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão para editar onboarding' }, { status: 403 })
  }

  const parsed = HeaderPatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const patch: Record<string, unknown> = {}
  if (parsed.data.owner_id !== undefined) patch.onboarding_owner_id = parsed.data.owner_id
  if (parsed.data.target_go_live !== undefined) patch.onboarding_target_go_live = parsed.data.target_go_live
  if (parsed.data.onboarding_health !== undefined) patch.onboarding_health = parsed.data.onboarding_health
  if (parsed.data.onboarding_status !== undefined) patch.onboarding_status = parsed.data.onboarding_status
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true })

  const admin = getSupabaseAdminClient() as any
  const { error } = await admin.from('contracts').update(patch).eq('id', parsed.data.contract_id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
