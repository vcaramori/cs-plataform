import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getModulePermission } from '@/lib/auth/get-module-permission'
import { recomputeContractOnboarding } from '@/lib/onboarding/onboarding-service'

const CreateSchema = z.object({
  contract_id: z.string().uuid(),
  name: z.string().min(1),
  milestone_type: z.string().optional(),
  planned_date: z.string().nullable().optional(),
  planned_end: z.string().nullable().optional(),
  owner_id: z.string().uuid().nullable().optional(),
  sort_order: z.number().int().optional(),
})

// POST /api/onboarding/milestones — adiciona um marco livre a um contrato
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getModulePermission(user.id, 'onboarding', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão para editar onboarding' }, { status: 403 })
  }

  const parsed = CreateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient() as any
  const { data: contract, error: cErr } = await admin
    .from('contracts').select('account_id').eq('id', parsed.data.contract_id).single()
  if (cErr || !contract) return NextResponse.json({ error: 'Contrato não encontrado' }, { status: 404 })

  // sort_order: se não informado, vai para o fim
  let sortOrder = parsed.data.sort_order
  if (sortOrder === undefined) {
    const { data: last } = await admin
      .from('onboarding_milestones').select('sort_order').eq('contract_id', parsed.data.contract_id)
      .order('sort_order', { ascending: false }).limit(1).single()
    sortOrder = (last?.sort_order ?? 0) + 1
  }

  const { data: row, error } = await admin
    .from('onboarding_milestones')
    .insert({
      contract_id: parsed.data.contract_id,
      account_id: contract.account_id,
      stage_key: null,
      name: parsed.data.name,
      milestone_type: parsed.data.milestone_type ?? 'milestone',
      status: 'pending',
      planned_date: parsed.data.planned_date ?? null,
      planned_end: parsed.data.planned_end ?? null,
      owner_id: parsed.data.owner_id ?? null,
      sort_order: sortOrder,
    })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const recompute = await recomputeContractOnboarding(admin, parsed.data.contract_id)
  return NextResponse.json({ ok: true, milestone_id: row.id, recompute }, { status: 201 })
}
