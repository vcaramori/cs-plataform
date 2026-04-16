import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getHealthClassification, calculateTrend } from '@/lib/health/utils'

const ManualScoreSchema = z.object({
  account_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  notes: z.string().optional(),
  evaluated_at: z.string().optional(),
  source_type: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = ManualScoreSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const { account_id, score, notes, evaluated_at, source_type } = parsed.data

  // Valida ownership
  const { data: account } = await supabase
    .from('accounts')
    .select('id, health_score, health_trend')
    .eq('id', account_id)
    .eq('csm_owner_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  const refDate = evaluated_at || new Date().toISOString().slice(0, 10)

  // Busca o shadow score vigente (último por data de referência)
  const { data: latestShadow } = await supabase
    .from('health_scores')
    .select('shadow_score')
    .eq('account_id', account_id)
    .not('shadow_score', 'is', null)
    .order('evaluated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  const shadowScore = latestShadow?.shadow_score != null ? Number(latestShadow.shadow_score) : null
  const discrepancyAlert = shadowScore !== null ? Math.abs(score - shadowScore) > 20 : false

  // Inserção da nova entrada histórica
  const { data: newEntry, error: insertError } = await supabase
    .from('health_scores')
    .insert({
      account_id,
      evaluated_at: refDate,
      manual_score: score,
      manual_notes: notes ?? null,
      classification: getHealthClassification(score),
      source_type: source_type ?? 'manual_update',
      created_by: user.id,
      discrepancy_alert: discrepancyAlert,
    })
    .select()
    .single()

  if (insertError) return NextResponse.json({ error: insertError.message }, { status: 500 })

  // Recalcular Score Vigente e Tendência para a tabela accounts
  // Buscamos os dois últimos manuais por evaluated_at DESC, created_at DESC
  const { data: history } = await supabase
    .from('health_scores')
    .select('manual_score, evaluated_at, created_at')
    .eq('account_id', account_id)
    .not('manual_score', 'is', null)
    .order('evaluated_at', { ascending: false })
    .order('created_at', { ascending: false })
    .limit(2)

  if (history && history.length > 0) {
    const vigente = history[0].manual_score
    const previous = history.length > 1 ? history[1].manual_score : vigente
    const trend = calculateTrend(Number(vigente), Number(previous))

    await supabase
      .from('accounts')
      .update({ 
        health_score: vigente, 
        health_trend: trend 
      })
      .eq('id', account_id)
  }

  return NextResponse.json(newEntry, { status: 201 })
}
