import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { queryVocSignals, type VocSignalsFilter, type VocSource, type Polarity } from '@/lib/voc/portfolio-voc'

/**
 * GET /api/voc/signals — drill-down: a lista de sinais por trás de QUALQUER clique do VoC.
 * Filtros: source, polarity, theme, account_id, day (ponto da tendência), date_from/date_to.
 * Só LEITURA (nenhuma chamada de IA). Respeita o RLS do banco.
 */
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const url = new URL(request.url)
    const now = new Date()
    const dateFrom = url.searchParams.get('date_from') || new Date(now.getTime() - 30 * 86400000).toISOString()
    const dateTo = url.searchParams.get('date_to') || now.toISOString()

    const filter: VocSignalsFilter = {
      dateFrom,
      dateTo,
      source: (url.searchParams.get('source') as VocSource) || undefined,
      polarity: (url.searchParams.get('polarity') as Polarity) || undefined,
      theme: url.searchParams.get('theme') || undefined,
      account_id: url.searchParams.get('account_id') || undefined,
      day: url.searchParams.get('day') || undefined,
    }

    const data = await queryVocSignals(supabase, filter)
    return NextResponse.json(data)
  } catch (error) {
    console.error('[voc/signals] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
