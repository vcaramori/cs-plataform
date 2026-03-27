import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ account_id: string }> }
) {
  const { account_id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Valida ownership
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', account_id)
    .eq('csm_owner_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  const { data: scores, error } = await supabase
    .from('health_scores')
    .select('*')
    .eq('account_id', account_id)
    .order('evaluated_at', { ascending: false })
    .limit(30)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const latest = scores?.[0] ?? null

  return NextResponse.json({
    manual: latest ? {
      score: latest.manual_score,
      date: latest.evaluated_at,
      notes: latest.manual_notes,
    } : null,
    shadow: latest ? {
      score: latest.shadow_score,
      justification: latest.shadow_reasoning,
      date: latest.evaluated_at,
      discrepancy: latest.discrepancy,
    } : null,
    discrepancy_alert: latest?.discrepancy_alert ?? false,
    history: (scores ?? []).map((s) => ({
      date: s.evaluated_at,
      manual_score: s.manual_score,
      shadow_score: s.shadow_score,
      discrepancy: s.discrepancy,
      discrepancy_alert: s.discrepancy_alert,
    })),
  })
}
