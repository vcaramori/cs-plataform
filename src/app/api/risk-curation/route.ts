import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'

const BodySchema = z.object({
  account_id: z.string().uuid(),
  source: z.enum(['alert', 'assessment']),
  source_id: z.string().uuid().optional(),
  risk_key: z.string().max(120).optional(),
  decision: z.enum(['confirmed', 'false_positive']),
  reason: z.string().max(2000).optional(),
})

// Salva a curadoria humana de um risco (confirmado / falso positivo + motivo).
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const parsed = BodySchema.safeParse(await request.json())
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  if (parsed.data.decision === 'false_positive' && !parsed.data.reason?.trim()) {
    return NextResponse.json({ error: 'Motivo é obrigatório para falso positivo.' }, { status: 400 })
  }

  const admin = getSupabaseAdminClient()
  const { error } = await (admin as any).from('risk_curation_feedback').insert({
    account_id: parsed.data.account_id,
    source: parsed.data.source,
    source_id: parsed.data.source_id ?? null,
    risk_key: parsed.data.risk_key ?? null,
    decision: parsed.data.decision,
    reason: parsed.data.reason?.trim() ?? null,
    curator_id: user.id,
  })
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ ok: true })
}

// Auditoria das curadorias de uma conta (decisão + motivo + autor + data).
export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const accountId = new URL(request.url).searchParams.get('account_id')
  if (!accountId) return NextResponse.json({ error: 'account_id obrigatório' }, { status: 400 })

  const admin = getSupabaseAdminClient()
  const { data, error } = await (admin as any)
    .from('risk_curation_feedback')
    .select('id, source, risk_key, decision, reason, created_at, profiles:curator_id(full_name)')
    .eq('account_id', accountId)
    .order('created_at', { ascending: false })
    .limit(50)
  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json({ feedback: data ?? [] })
}
