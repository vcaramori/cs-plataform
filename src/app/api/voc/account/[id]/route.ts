import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getAccountVoc } from '@/lib/voc/portfolio-voc'

/**
 * GET /api/voc/account/[id]?date_from=ISO&date_to=ISO
 * Voz do Cliente de UMA conta: tendência, distribuição por fonte, dores/encantos
 * e feed completo de sinais (cada um com evidência). Só LEITURA.
 */
export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { id } = await params
    const url = new URL(request.url)
    const now = new Date()
    const dateFrom = url.searchParams.get('date_from') || new Date(now.getTime() - 90 * 86400000).toISOString()
    const dateTo = url.searchParams.get('date_to') || now.toISOString()

    const data = await getAccountVoc(supabase, id, { dateFrom, dateTo })
    return NextResponse.json(data)
  } catch (error) {
    console.error('[voc/account] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
