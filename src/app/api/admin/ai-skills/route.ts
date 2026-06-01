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

const SkillSchema = z.object({
  name: z.string().min(2, 'Nome obrigatório'),
  description: z.string().optional().nullable(),
  when_to_use: z.string().optional().nullable(),
  body: z.string().default(''),
  applies_to: z.array(z.string()).default(['global']),
  is_active: z.boolean().default(true),
  sort_order: z.number().int().optional(),
})

export async function GET() {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const db = getSupabaseAdminClient() as any
  const { data, error } = await db.from('ai_skills').select('*').order('sort_order').order('name')
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const user = await requireAdmin()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  const parsed = SkillSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const db = getSupabaseAdminClient() as any
  const { data, error } = await db.from('ai_skills').insert(parsed.data).select().single()
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  invalidateAIContextCache()
  return NextResponse.json(data, { status: 201 })
}
