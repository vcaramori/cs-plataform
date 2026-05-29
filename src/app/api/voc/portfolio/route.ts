import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getPortfolioVoc } from '@/lib/voc/portfolio-voc'

/**
 * GET /api/voc/portfolio?date_from=ISO&date_to=ISO
 * Retorna a Voz do Cliente agregada de TODO o portfólio (não filtrada por CSM),
 * respeitando o RLS do banco. Substitui as rotas por-CSM (sentiment-trends,
 * top-themes, quotes), que dependiam de tabelas/colunas inexistentes.
 */
export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const url = new URL(request.url)
    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 86400000)
    const dateFrom = url.searchParams.get('date_from') || defaultFrom.toISOString()
    const dateTo = url.searchParams.get('date_to') || now.toISOString()

    const data = await getPortfolioVoc(supabase, { dateFrom, dateTo })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[voc/portfolio] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
