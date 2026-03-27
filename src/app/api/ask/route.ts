import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { runRAGPipeline } from '@/lib/rag/pipeline'

const BodySchema = z.object({
  question: z.string().min(3).max(500),
  account_id: z.string().uuid().optional(),
})

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = BodySchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  // Se account_id foi passado, valida ownership
  if (parsed.data.account_id) {
    const { data: account } = await supabase
      .from('accounts')
      .select('id')
      .eq('id', parsed.data.account_id)
      .eq('csm_owner_id', user.id)
      .single()
    if (!account) return NextResponse.json({ error: 'Conta não encontrada' }, { status: 404 })
  }

  try {
    const result = await runRAGPipeline(
      parsed.data.question,
      user.id,
      parsed.data.account_id
    )
    return NextResponse.json(result)
  } catch (err) {
    const msg = err instanceof Error ? err.message : 'Erro desconhecido'
    return NextResponse.json({ error: `Falha no RAG: ${msg}` }, { status: 500 })
  }
}
