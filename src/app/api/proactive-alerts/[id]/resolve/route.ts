import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Buscar alerta
  const { data: alert, error: fetchError } = await supabase
    .from('proactive_alerts')
    .select('account_id')
    .eq('id', id)
    .single()

  if (fetchError || !alert) {
    return NextResponse.json({ error: 'Alert not found' }, { status: 404 })
  }

  // Validar ownership (CSM da conta)
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', alert.account_id)
    .eq('csm_owner_id', user.id)
    .single()

  if (!account) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  // Marcar como resolvido
  const { data, error } = await supabase
    .from('proactive_alerts')
    .update({ resolved_at: new Date().toISOString(), updated_at: new Date().toISOString() })
    .eq('id', id)
    .select()
    .single()

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json(data)
}
