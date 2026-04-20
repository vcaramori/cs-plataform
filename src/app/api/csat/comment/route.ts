import { NextResponse } from 'next/server'
import { createAdminClient } from '@/lib/supabase/admin'
import { z } from 'zod'

const Schema = z.object({
  token: z.string().uuid(),
  comment: z.string().max(2000)
})

export async function POST(request: Request) {
  const body = await request.json()
  const parsed = Schema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.format() }, { status: 400 })

  const supabase = createAdminClient()

  const { data: tokenRow } = await supabase
    .from('csat_tokens')
    .select('ticket_id, used_at')
    .eq('token', parsed.data.token)
    .single()

  if (!tokenRow) return NextResponse.json({ error: 'Token inválido' }, { status: 404 })
  if (!tokenRow.used_at) return NextResponse.json({ error: 'Token ainda não foi utilizado para registrar score' }, { status: 400 })

  const { error } = await supabase
    .from('csat_responses')
    .update({ comment: parsed.data.comment })
    .eq('ticket_id', tokenRow.ticket_id)
    .is('comment', null)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
