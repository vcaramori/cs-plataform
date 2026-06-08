import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getModulePermission } from '@/lib/auth/get-module-permission'
import { recomputeContractOnboarding } from '@/lib/onboarding/onboarding-service'
import { ingestOnboardingEvent } from '@/lib/rag/rag-pipeline'

const PatchSchema = z.object({
  status: z.enum(['pending', 'in-progress', 'done', 'skipped']).optional(),
  name: z.string().optional(),
  milestone_type: z.string().optional(),
  planned_date: z.string().nullable().optional(),
  planned_end: z.string().nullable().optional(),
  completed_date: z.string().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  notes: z.string().nullable().optional(),
  sort_order: z.number().int().optional(),
})

// PATCH /api/onboarding/milestones/:id
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await getModulePermission(user.id, 'onboarding', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão para editar onboarding' }, { status: 403 })
  }

  const parsed = PatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient() as any

  const { data: current, error: curErr } = await admin
    .from('onboarding_milestones')
    .select('id, contract_id, account_id, stage_key, name, status')
    .eq('id', id)
    .single()
  if (curErr || !current) return NextResponse.json({ error: 'Milestone não encontrado' }, { status: 404 })

  const patch: Record<string, unknown> = { ...parsed.data }
  // Ao concluir, registra a data se não informada; ao reabrir, limpa.
  if (parsed.data.status === 'done' && parsed.data.completed_date === undefined) {
    patch.completed_date = new Date().toISOString().slice(0, 10)
  }
  if (parsed.data.status && parsed.data.status !== 'done' && parsed.data.completed_date === undefined) {
    patch.completed_date = null
  }

  const { error: upErr } = await admin.from('onboarding_milestones').update(patch).eq('id', id)
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 })

  // Recalcula etapa/status do contrato a partir do checklist
  const recompute = await recomputeContractOnboarding(admin, current.contract_id)

  // Registra evento de mudança de etapa + ingere no RAG (best-effort)
  if (parsed.data.status && parsed.data.status !== current.status) {
    const { data: ev } = await admin
      .from('onboarding_events')
      .insert({
        contract_id: current.contract_id,
        account_id: current.account_id,
        milestone_id: id,
        event_type: 'status_change',
        title: `Etapa "${current.name ?? current.stage_key}" → ${parsed.data.status}`,
        description: parsed.data.notes ?? null,
        created_by: user.id,
      })
      .select('id')
      .single()
    if (ev?.id) { try { await ingestOnboardingEvent(ev.id) } catch { /* best-effort */ } }
  }

  return NextResponse.json({ ok: true, recompute })
}

// DELETE /api/onboarding/milestones/:id — remove um marco e recalcula o contrato
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getModulePermission(user.id, 'onboarding', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão para editar onboarding' }, { status: 403 })
  }

  const admin = getSupabaseAdminClient() as any
  const { data: current } = await admin.from('onboarding_milestones').select('contract_id').eq('id', id).single()
  if (!current) return NextResponse.json({ error: 'Milestone não encontrado' }, { status: 404 })

  const { error } = await admin.from('onboarding_milestones').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const recompute = await recomputeContractOnboarding(admin, current.contract_id)
  return NextResponse.json({ ok: true, recompute })
}
