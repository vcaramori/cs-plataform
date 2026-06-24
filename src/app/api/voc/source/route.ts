import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

/**
 * GET /api/voc/source?source=interaction|nps&id=<source_id>
 * Retorna o registro COMPLETO da origem que gerou um sinal de Voz do Cliente,
 * para abrir o detalhe (transcrição da reunião / feedback de NPS) num modal,
 * sem sair da tela da VOC. Só LEITURA (respeita RLS do usuário).
 */
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const source = url.searchParams.get('source')
    const id = url.searchParams.get('id')
    if (!source || !id) return NextResponse.json({ error: 'source e id são obrigatórios' }, { status: 400 })

    if (source === 'interaction') {
      const { data, error } = await supabase.from('interactions').select('*').eq('id', id).maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'Interação não encontrada' }, { status: 404 })
      return NextResponse.json({ source: 'interaction', interaction: data })
    }

    if (source === 'nps') {
      const { data, error } = await supabase
        .from('nps_responses')
        .select('*, nps_answers ( *, nps_questions (*) )')
        .eq('id', id)
        .maybeSingle()
      if (error) return NextResponse.json({ error: error.message }, { status: 500 })
      if (!data) return NextResponse.json({ error: 'Resposta de NPS não encontrada' }, { status: 404 })
      return NextResponse.json({ source: 'nps', nps: data })
    }

    return NextResponse.json({ error: `Origem não suportada: ${source}` }, { status: 400 })
  } catch (error) {
    console.error('[voc/source] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
