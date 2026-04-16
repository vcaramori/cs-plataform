import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { generateShadowScore } from '@/lib/health/shadow-score'
import { getHealthClassification } from '@/lib/health/utils'

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

  const { account_id } = parsed.data

  // Valida ownership
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', account_id)
    .eq('csm_owner_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  let shadowResult
  try {
    shadowResult = await generateShadowScore(account_id)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Falha ao gerar Shadow Score: ${msg}` }, { status: 500 })
  }

  const today = new Date().toISOString().slice(0, 10)

  // Busca o último score manual vigente para calcular discrepância
  const { data: latestManual } = await supabase
    .from('health_scores')
    .select('manual_score')
    .eq('account_id', account_id)
    .not('manual_score', 'is', null)
    .order('evaluated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const manualScore = latestManual?.manual_score != null ? Number(latestManual.manual_score) : null
  const discrepancyAlert = manualScore !== null ? Math.abs(manualScore - shadowResult.score) > 20 : false

  // Inserção da nova entrada histórica de IA
  const { data: newEntry, error: insertError } = await supabase
    .from('health_scores')
    .insert({
      account_id,
      evaluated_at: today, // Analisado hoje
      shadow_score: shadowResult.score,
      shadow_reasoning: shadowResult.justification,
      classification: getHealthClassification(shadowResult.score),
      source_type: 'ai_generation',
      discrepancy_alert: discrepancyAlert,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Atualiza alerta de discrepância na tabela accounts
  await supabase
    .from('accounts')
    .update({ 
      discrepancy_alert: discrepancyAlert,
    })
    .eq('id', account_id)

  return NextResponse.json({
    ...newEntry,
    shadow_trend: shadowResult.trend,
    risk_factors: shadowResult.risk_factors,
    confidence: shadowResult.confidence,
    discrepancy_alert: discrepancyAlert,
  })
}
