import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { generateShadowScore } from '@/lib/health/shadow-score'

const BodySchema = z.object({
  account_id: z.string().uuid(),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Valida ownership
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', parsed.data.account_id)
    .eq('csm_owner_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  let shadowResult
  try {
    shadowResult = await generateShadowScore(parsed.data.account_id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Falha ao gerar Shadow Score: ${msg}` }, { status: 500 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Busca score manual do dia para calcular discrepância
  const { data: existing } = await supabase
    .from('health_scores')
    .select('id, manual_score')
    .eq('account_id', parsed.data.account_id)
    .eq('evaluated_at', today)
    .single()

  const discrepancyAlert = existing?.manual_score !== null && existing?.manual_score !== undefined
    ? Math.abs(Number(existing.manual_score) - shadowResult.score) > 20
    : false

  let data, error
  if (existing) {
    ;({ data, error } = await supabase
      .from('health_scores')
      .update({
        shadow_score: shadowResult.score,
        shadow_reasoning: shadowResult.justification,
        discrepancy_alert: discrepancyAlert,
      })
      .eq('id', existing.id)
      .select()
      .single())
  } else {
    ;({ data, error } = await supabase
      .from('health_scores')
      .insert({
        account_id: parsed.data.account_id,
        evaluated_at: today,
        shadow_score: shadowResult.score,
        shadow_reasoning: shadowResult.justification,
        discrepancy_alert: false,
      })
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({
    ...data,
    shadow_trend: shadowResult.trend,
    risk_factors: shadowResult.risk_factors,
    confidence: shadowResult.confidence,
    discrepancy_alert: discrepancyAlert,
  })
}
