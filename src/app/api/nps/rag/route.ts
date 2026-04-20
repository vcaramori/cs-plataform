import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { generateEmbedding } from '@/lib/llm/gateway'
import { getNPSSegment } from '@/lib/supabase/types'

const RAGSchema = z.object({
  account_id: z.string().uuid().optional(),
})

// POST /api/nps/rag — ingere dados de NPS no RAG (embeddings) para análise semântica
export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()
  const parsed = RAGSchema.safeParse(body)
  if (!parsed.success) return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })

  const admin = getSupabaseAdminClient()
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const db = admin as any

  // Busca contas do CSM
  const { data: myAccounts } = await supabase
    .from('accounts')
    .select('id, name')
    .eq('csm_owner_id', user.id)

  const targetIds = parsed.data.account_id
    ? [parsed.data.account_id]
    : (myAccounts ?? []).map((a: any) => a.id)

  if (targetIds.length === 0) {
    return NextResponse.json({ ingested: 0, message: 'Nenhuma conta para processar' })
  }

  const accountNameMap = Object.fromEntries((myAccounts ?? []).map((a: any) => [a.id, a.name]))

  // Busca respostas NPS com comentários (comentários são o conteúdo semântico relevante)
  const { data: responses, error } = await db
    .from('nps_responses')
    .select('*')
    .in('account_id', targetIds)
    .eq('dismissed', false)
    .not('comment', 'is', null)
    .not('score', 'is', null)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  const toIngest = responses ?? []
  let ingested = 0

  for (const r of toIngest) {
    const accountName = accountNameMap[r.account_id] ?? 'Conta desconhecida'
    const segment = getNPSSegment(r.score)
    const segLabel = segment === 'promoter' ? 'PROMOTOR' : segment === 'passive' ? 'NEUTRO' : 'DETRATOR'
    const tagStr = r.tags?.length > 0 ? `Tags: ${r.tags.join(', ')}. ` : ''

    const chunkText = `NPS Response | ${accountName} | Score: ${r.score}/10 (${segLabel}) | ${tagStr}Comentário: ${r.comment} | Email: ${r.user_email} | Data: ${r.responded_at ?? r.created_at}`

    const { result: embedding } = await generateEmbedding(chunkText, { allowFallback: true })

    // Upsert no embeddings (usa source_type='nps_response' e source_id=response.id)
    const { error: embErr } = await db
      .from('embeddings')
      .upsert({
        account_id: r.account_id,
        source_type: 'nps_response',
        source_id: r.id,
        chunk_index: 0,
        chunk_text: chunkText,
        embedding,
      }, { onConflict: 'source_type,source_id,chunk_index' })

    if (!embErr) ingested++
  }

  return NextResponse.json({ ingested, total: toIngest.length })
}
