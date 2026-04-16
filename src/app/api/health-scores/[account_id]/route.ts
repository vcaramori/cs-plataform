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
    .order('created_at', { ascending: false })
    .limit(50)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const safeScores = scores ?? []
  
  // Encontra os vigentes (últimos por data de referência)
  const latestManual = safeScores.find(s => s.manual_score !== null)
  const latestShadow = safeScores.find(s => s.shadow_score !== null)

  return NextResponse.json({
    account_id,
    manual: latestManual ? {
      score: latestManual.manual_score,
      date: latestManual.evaluated_at,
      notes: latestManual.manual_notes,
      classification: latestManual.classification,
      source_type: latestManual.source_type,
    } : null,
    shadow: latestShadow ? {
      score: latestShadow.shadow_score,
      justification: latestShadow.shadow_reasoning,
      date: latestShadow.evaluated_at,
      classification: latestShadow.classification,
      discrepancy: latestShadow.discrepancy,
    } : null,
    discrepancy_alert: latestManual?.discrepancy_alert || latestShadow?.discrepancy_alert || false,
    history: safeScores.map((s) => ({
      id: s.id,
      date: s.evaluated_at,
      created_at: s.created_at,
      manual_score: s.manual_score,
      shadow_score: s.shadow_score,
      classification: s.classification,
      notes: s.manual_notes,
      shadow_reasoning: s.shadow_reasoning,
      source_type: s.source_type,
      discrepancy_alert: s.discrepancy_alert,
    })),
  })
}
