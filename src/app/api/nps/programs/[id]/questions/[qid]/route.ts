import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const PatchSchema = z.object({
  title: z.string().min(1).optional(),
  options: z.array(z.string()).nullable().optional(),
  required: z.boolean().optional(),
  order_index: z.number().int().min(0).optional(),
})

// PATCH /api/nps/programs/[id]/questions/[qid]
export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const { id, qid } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Valida ownership via programa
  const { data: program } = await db
    .from('nps_programs')
    .select('csm_owner_id, accounts(csm_owner_id)')
    .eq('id', id)
    .single()

  const isOwner =
    program?.csm_owner_id === user.id ||
    program?.accounts?.csm_owner_id === user.id

  if (!program || !isOwner)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const body = await request.json()
  const parsed = PatchSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { data, error } = await db
    .from('nps_questions')
    .update(parsed.data)
    .eq('id', qid)
    .eq('program_id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

// DELETE /api/nps/programs/[id]/questions/[qid]
export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string; qid: string }> }
) {
  const { id, qid } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  const { data: program } = await db
    .from('nps_programs')
    .select('csm_owner_id, accounts(csm_owner_id)')
    .eq('id', id)
    .single()

  const isOwner =
    program?.csm_owner_id === user.id ||
    program?.accounts?.csm_owner_id === user.id

  if (!program || !isOwner)
    return NextResponse.json({ error: 'Não autorizado' }, { status: 403 })

  const { error } = await db
    .from('nps_questions')
    .delete()
    .eq('id', qid)
    .eq('program_id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return new NextResponse(null, { status: 204 })
}
