import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { deleteToken, hasToken } from '@/lib/integrations/readai/tokens'

export const dynamic = 'force-dynamic'

/**
 * Status da conexão Read.ai do usuário logado (sem expor credenciais).
 * A conexão é feita por OAuth: GET /api/integrations/readai/connect inicia o login.
 */
export async function GET() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  return NextResponse.json({ connected: await hasToken(user.id) })
}

/** Desconecta: remove as credenciais OAuth do usuário. */
export async function DELETE() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  await deleteToken(user.id)
  return NextResponse.json({ success: true, connected: false })
}
