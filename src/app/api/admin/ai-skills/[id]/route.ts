import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { invalidateAIContextCache } from '@/lib/ai/ai-context'

async function requireAdmin() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return null
  const { data: profile } = await supabase.from('profiles').select('role').eq('id', user.id).single()
  if (!profile || !['admin', 'super_admin'].includes(profile.role ?? '')) return null
  return user
}

const UpdateSkillSchema = z.object({
  name: z.string().min(2).optional(),
  description: z.string().optional().nullable(),
  when_to_use: z.string().optional().nullable(),
  body: z.string().optional(),
  applies_to: z.array(z.string()).optional(),
  is_active: z.boolean().optional(),
  sort_order: z.number().int().optional(),
})

export async function PATCH(request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const parsed = UpdateSkillSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const db = getSupabaseAdminClient() as any
  const { data, error } = await db.from('ai_skills').update(parsed.data).eq('id', id).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateAIContextCache()
  return NextResponse.json(data)
}

export async function DELETE(_request: Request, { params }: { params: Promise<{ id: string }> }) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const { id } = await params
  const db = getSupabaseAdminClient() as any
  const { error } = await db.from('ai_skills').delete().eq('id', id)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateAIContextCache()
  return NextResponse.json({ success: true })
}
