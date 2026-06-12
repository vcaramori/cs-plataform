import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const Schema = z.object({
  alert_ids: z.array(z.string().uuid()).min(1),
  read: z.boolean(),
})

// POST /api/alerts/read — marca alertas como lidos (read=true) ou não-lidos (read=false)
// para o usuário atual. RLS de alert_reads garante que cada um só gerencia o seu.
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = Schema.safeParse(await request.json().catch(() => ({})))
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
  const { alert_ids, read } = parsed.data

  // `alert_reads` é nova (ainda fora dos tipos gerados) — usa client destipado.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = supabase as any

  if (read) {
    const rows = alert_ids.map(id => ({ user_id: user.id, alert_id: id }))
    const { error } = await db.from('alert_reads').upsert(rows, { onConflict: 'user_id,alert_id' })
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  } else {
    const { error } = await db.from('alert_reads').delete().eq('user_id', user.id).in('alert_id', alert_ids)
    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}
