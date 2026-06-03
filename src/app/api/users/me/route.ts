import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const SelfSchema = z.object({
  avatar_url: z.string().optional().nullable(),
  full_name: z.string().min(1).optional(),
})

/**
 * PATCH /api/users/me — atualiza dados do PRÓPRIO perfil (foto e nome).
 * Disponível a qualquer usuário autenticado (não exige manage:users) e só
 * afeta a própria linha. Não permite alterar role/custom_role_id/is_active.
 */
export async function PATCH(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = SelfSchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const updateData: Record<string, any> = {}
  if (parsed.data.avatar_url !== undefined) updateData.avatar_url = parsed.data.avatar_url
  if (parsed.data.full_name !== undefined) updateData.full_name = parsed.data.full_name
  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'Nada para atualizar' }, { status: 400 })
  }

  const admin = getSupabaseAdminClient() as any
  const { data, error } = await admin
    .from('profiles')
    .update(updateData)
    .eq('id', user.id)
    .select('id, full_name, avatar_url')
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}
