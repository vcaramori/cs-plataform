import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const submitSchema = z.object({
  token: z.string().uuid(),
  score: z.number().min(1).max(5),
  comment: z.string().optional()
})

export async function POST(request: Request) {
  const supabase = createAdminClient() // Use admin to verify token and insert response
  const body = await request.json()

  const parsed = submitSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const { token, score, comment } = parsed.data

  // 1. Validate token
  const { data: tokenData, error: tokenError } = await supabase
    .from('csat_tokens')
    .select('*, ticket:support_tickets(id, account_id)')
    .eq('token', token)
    .single()

  if (tokenError || !tokenData) {
    return NextResponse.json({ error: 'Token inválido.' }, { status: 404 })
  }

  // Check if already used
  if (tokenData.used_at) {
    return NextResponse.json({ error: 'Este link já foi utilizado.' }, { status: 410 })
  }

  // Check expiration
  if (new Date(tokenData.expires_at) < new Date()) {
    return NextResponse.json({ error: 'Este link expirou.' }, { status: 410 })
  }

  // 2. Insert Response
  const { error: responseError } = await supabase
    .from('csat_responses')
    .insert({
      ticket_id: tokenData.ticket_id,
      account_id: (tokenData.ticket as any).account_id,
      score: score,
      comment: comment || null,
      respondent_email: 'cliente@exemplo.com', // No cenário real, teríamos o e-mail atrelado ao token
      answered_at: new Date().toISOString()
    })

  if (responseError) {
    console.error('[CSAT Submit] Error inserting response:', responseError)
    return NextResponse.json({ error: 'Erro ao salvar resposta.' }, { status: 500 })
  }

  // 3. Mark token as used
  await supabase
    .from('csat_tokens')
    .update({ used_at: new Date().toISOString() })
    .eq('id', tokenData.id)

  return NextResponse.json({ success: true, message: 'Obrigado pelo seu feedback!' })
}
