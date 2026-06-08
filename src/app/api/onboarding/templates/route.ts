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
const CreateSchema = z.object({
  name: z.string().min(1),
  description: z.string().optional(),
  project_type: z.string().optional(),
  items: z.array(ItemSchema).optional(),
})

// GET /api/onboarding/templates — biblioteca de templates + itens
export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient() as any
  const { data: templates } = await admin.from('onboarding_templates').select('*').order('name')
  const ids = (templates ?? []).map((t: any) => t.id)
  let itemsByTemplate: Record<string, any[]> = {}
  if (ids.length) {
    const { data: items } = await admin.from('onboarding_template_items').select('*').in('template_id', ids).order('sort_order')
    for (const it of items ?? []) (itemsByTemplate[it.template_id] ??= []).push(it)
  }
  return NextResponse.json((templates ?? []).map((t: any) => ({ ...t, items: itemsByTemplate[t.id] ?? [] })))
}

// POST /api/onboarding/templates — cria template (+ itens)
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  if (!(await getModulePermission(user.id, 'onboarding', 'edit'))) {
    return NextResponse.json({ error: 'Sem permissão' }, { status: 403 })
  }

  const parsed = CreateSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient() as any
  const { data: tpl, error } = await admin
    .from('onboarding_templates')
    .insert({ name: parsed.data.name, description: parsed.data.description ?? null, project_type: parsed.data.project_type ?? null })
    .select('id')
    .single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const items = parsed.data.items ?? []
  if (items.length) {
    const rows = items.map((it, i) => ({
      template_id: tpl.id, name: it.name, milestone_type: it.milestone_type ?? 'milestone',
      offset_days: it.offset_days, duration_days: it.duration_days ?? 0, sort_order: it.sort_order ?? i + 1,
    }))
    const { error: itErr } = await admin.from('onboarding_template_items').insert(rows)
    if (itErr) return NextResponse.json({ error: itErr.message }, { status: 500 })
  }
  return NextResponse.json({ ok: true, template_id: tpl.id }, { status: 201 })
}
