import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const ManualScoreSchema = z.object({
  account_id: z.string().uuid(),
  score: z.number().min(0).max(100),
  notes: z.string().optional(),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = ManualScoreSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Valida ownership
  const { data: account } = await supabase
    .from('accounts')
    .select('id')
    .eq('id', parsed.data.account_id)
    .eq('csm_owner_id', user.id)
    .single()
  if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })

  const today = new Date().toISOString().slice(0, 10)

  // Upsert do score manual de hoje
  const { data: existing } = await supabase
    .from('health_scores')
    .select('id, shadow_score')
    .eq('account_id', parsed.data.account_id)
    .eq('evaluated_at', today)
    .single()

  const discrepancyAlert = existing?.shadow_score !== null && existing?.shadow_score !== undefined
    ? Math.abs(parsed.data.score - Number(existing.shadow_score)) > 20
    : false

  let data, error
  if (existing) {
    ;({ data, error } = await supabase
      .from('health_scores')
      .update({
        manual_score: parsed.data.score,
        manual_notes: parsed.data.notes ?? null,
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
        manual_score: parsed.data.score,
        manual_notes: parsed.data.notes ?? null,
        discrepancy_alert: false,
      })
      .select()
      .single())
  }

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  // Atualiza health_score na tabela accounts
  await supabase
    .from('accounts')
    .update({ health_score: parsed.data.score })
    .eq('id', parsed.data.account_id)

  return NextResponse.json(data, { status: 201 })
}
