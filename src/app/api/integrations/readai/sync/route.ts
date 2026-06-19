import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { runReadAiSyncForUser } from '@/lib/integrations/readai/sync'
import { hasToken } from '@/lib/integrations/readai/tokens'

export const dynamic = 'force-dynamic'
export const maxDuration = 300

/**
 * Importa as reuniões do PRÓPRIO CSM logado. Usado logo após conectar (histórico completo)
 * e pelo botão "Importar minhas reuniões". force=true → backfill completo.
 * Body opcional: { force?: boolean, source?: 'connect' | 'manual' } (default: manual).
 */
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  if (!(await hasToken(user.id))) {
    return NextResponse.json({ error: 'Read.ai não conectado' }, { status: 400 })
  }

  const body = await request.json().catch(() => ({}))
  const source = body?.source === 'connect' ? 'connect' : 'manual'
  const force = body?.force !== false // default: força histórico completo

  try {
    const result = await runReadAiSyncForUser(user.id, { source, force })
    return NextResponse.json({ success: true, result })
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
