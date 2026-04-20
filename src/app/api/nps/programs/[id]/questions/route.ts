import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const QuestionSchema = z.object({
  type: z.enum(['nps_scale', 'multiple_choice', 'text']),
  title: z.string().min(1),
  options: z.array(z.string()).nullable().optional(),
  required: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
})

async function assertProgramOwner(programId: string, userId: string) {
  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const { data } = await db
    .from('nps_programs')
    .select('id, csm_owner_id, account_id, accounts(csm_owner_id)')
    .eq('id', programId)
    .single()
  if (!data) return false
  if (data.csm_owner_id === userId) return true
  if (data.accounts?.csm_owner_id === userId) return true
  return false
}

// GET /api/nps/programs/[id]/questions
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await assertProgramOwner(id, user.id)))
    return NextResponse.json({ error: 'Programa não encontrado' }, { status: 404 })

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any
  const { data, error } = await db
    .from('nps_questions')
    .select('*')
    .eq('program_id', id)
    .order('order_index', { ascending: true })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data ?? [])
}

// POST /api/nps/programs/[id]/questions
export async function POST(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await assertProgramOwner(id, user.id)))
    return NextResponse.json({ error: 'Programa não encontrado' }, { status: 404 })

  const body = await request.json()
  const parsed = QuestionSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Determina próximo order_index
  const { data: existing } = await db
    .from('nps_questions')
    .select('order_index')
    .eq('program_id', id)
    .order('order_index', { ascending: false })
    .limit(1)
    .maybeSingle()

  const nextOrder = parsed.data.order_index ?? ((existing?.order_index ?? -1) + 1)

  const { data, error } = await db
    .from('nps_questions')
    .insert({
      program_id: id,
      type: parsed.data.type,
      title: parsed.data.title,
      options: parsed.data.options ?? null,
      required: parsed.data.required ?? false,
      order_index: nextOrder,
    })
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data, { status: 201 })
}
