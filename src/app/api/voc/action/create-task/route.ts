import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * POST /api/voc/action/create-task — cria uma atividade (csm_tasks) a partir de um sinal de VoC.
 * A tarefa aparece em /atividades do CSM logado. Origem registrada na descrição (padrão do projeto).
 * Body: { account_id, source, source_id, title?, description?, polarity? }
 */
export async function POST(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const body = await request.json().catch(() => ({}))
    const accountId = body?.account_id || null
    const source = String(body?.source ?? 'voc')
    const sourceId = body?.source_id ? String(body.source_id) : null
    const polarity = body?.polarity === 'positive' || body?.polarity === 'negative' || body?.polarity === 'neutral' ? body.polarity : 'neutral'

    const title = String(body?.title ?? '').trim().slice(0, 200) || 'Tratar voz do cliente'
    const baseDesc = String(body?.description ?? '').trim().slice(0, 1000)
    const origin = `\n\n— Origem: Voz do Cliente (${source}${sourceId ? ` · ${sourceId}` : ''})`
    const description = (baseDesc ? baseDesc : 'Ação criada a partir de um sinal de Voz do Cliente.') + origin

    const { data, error } = await supabase
      .from('csm_tasks')
      .insert({
        csm_id: user.id,
        account_id: accountId,
        title,
        description,
        activity_type: 'follow_up',
        status: 'todo',
        priority: polarity === 'negative' ? 'high' : 'medium',
        source_label: 'manual',
      })
      .select('id')
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })
    return NextResponse.json({ id: (data as any).id })
  } catch (error) {
    console.error('[voc/action/create-task] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
