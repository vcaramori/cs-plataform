import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getUserAccessScope, getModulePermission } from '@/lib/auth/get-module-permission'
import { seedMilestonesForContract } from '@/lib/onboarding/onboarding-service'
import { ingestOnboardingEvent } from '@/lib/rag/rag-pipeline'

const StartSchema = z.object({
  contract_id: z.string().uuid(),
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

  // Catálogo de etapas (sempre útil p/ board e checklist)
  const { data: stages } = await admin
    .from('onboarding_stages')
    .select('key, label, sort_order')
    .eq('is_active', true)
    .order('sort_order')

  // ----- Detalhe de um contrato -----
  if (contractId) {
    const { data: contract } = await admin
      .from('contracts')
      .select('id, description, contract_code, account_id, onboarding_status, onboarding_current_stage, onboarding_owner_id, onboarding_started_at, onboarding_target_go_live, onboarding_completed_at, onboarding_health, accounts(name)')
      .eq('id', contractId)
      .single()
    const { data: milestones } = await admin
      .from('onboarding_milestones')
      .select('*')
      .eq('contract_id', contractId)
      .order('sort_order')
    return NextResponse.json({ stages: stages ?? [], contract, milestones: milestones ?? [] })
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
      .select('contract_id, stage_key, status, sort_order, planned_date, completed_date')
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
      progress: { done, total, pct: total > 0 ? Math.round((done / total) * 100) : 0 },
    }
  })

  return NextResponse.json({ stages: stages ?? [], items })
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
  const { contract_id, owner_id, target_go_live } = parsed.data

  const admin = getSupabaseAdminClient() as any

  const { data: contract, error: cErr } = await admin
    .from('contracts')
    .select('id, account_id, onboarding_status')
    .eq('id', contract_id)
    .single()
  if (cErr || !contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  // 1. Cria milestones a partir do catálogo
  await seedMilestonesForContract(admin, contract_id, contract.account_id)

  // 2. Define a 1ª etapa como atual e marca o contrato em onboarding
  const { data: firstStage } = await admin
    .from('onboarding_stages')
    .select('key')
    .eq('is_active', true)
    .order('sort_order')
    .limit(1)
    .single()

  const { error: upErr } = await admin
    .from('contracts')
    .update({
      onboarding_status: 'in-progress',
      onboarding_started_at: new Date().toISOString(),
      onboarding_current_stage: firstStage?.key ?? null,
      onboarding_owner_id: owner_id ?? null,
      onboarding_target_go_live: target_go_live ?? null,
      onboarding_health: 'on-track',
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
      description: 'Checklist de onboarding criado a partir das etapas padrão.',
      created_by: user.id,
    })
    .select('id')
    .single()
  if (ev?.id) { try { await ingestOnboardingEvent(ev.id) } catch { /* ingest best-effort */ } }

  return NextResponse.json({ ok: true, contract_id }, { status: 201 })
}
