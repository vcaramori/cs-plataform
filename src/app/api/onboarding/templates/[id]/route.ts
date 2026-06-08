import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getModulePermission } from '@/lib/auth/get-module-permission'

const ItemSchema = z.object({
  name: z.string().min(1),
  milestone_type: z.string().optional(),
  offset_days: z.number().int(),
  duration_days: z.number().int().optional(),
  sort_order: z.number().int().optional(),
})
const PatchSchema = z.object({
  name: z.string().optional(),
  description: z.string().nullable().optional(),
  project_type: z.string().nullable().optional(),
  is_active: z.boolean().optional(),
  // Se enviado, substitui TODOS os itens do template.
  items: z.array(ItemSchema).optional(),
})

// PATCH /api/onboarding/templates/:id — atualiza meta e/ou substitui itens
export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getModulePermission(user.id, 'onboarding', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const parsed = PatchSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient() as any
  const meta: Record<string, unknown> = {}
  for (const k of ['name', 'description', 'project_type', 'is_active'] as const) {
    if (parsed.data[k] !== undefined) meta[k] = parsed.data[k]
  }
  if (Object.keys(meta).length) {
    const { error } = await admin.from('onboarding_templates').update(meta).eq('id', id)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  if (parsed.data.items) {
    await admin.from('onboarding_template_items').delete().eq('template_id', id)
    if (parsed.data.items.length) {
      const rows = parsed.data.items.map((it, i) => ({
        template_id: id, name: it.name, milestone_type: it.milestone_type ?? 'milestone',
        offset_days: it.offset_days, duration_days: it.duration_days ?? 0, sort_order: it.sort_order ?? i + 1,
      }))
      const { error: itErr } = await admin.from('onboarding_template_items').insert(rows)
      if (itErr) return NextResponse.json({ error: itErr.message }, { status: 500 })
    }
  }
  return NextResponse.json({ ok: true })
}

// DELETE /api/onboarding/templates/:id
export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getModulePermission(user.id, 'onboarding', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }
  const admin = getSupabaseAdminClient() as any
  const { error } = await admin.from('onboarding_templates').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}
