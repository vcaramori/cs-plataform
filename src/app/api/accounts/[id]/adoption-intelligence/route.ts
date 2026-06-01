import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id: accountId } = await params
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // NOTA: ainda não há fonte real de "adoption intelligence" agregada por conta.
    // Em vez de devolver dados fabricados (que enganam quem consome), retornamos
    // estrutura vazia + available:false, para o cliente exibir estado honesto de
    // "indisponível". Dados reais de adoção por feature vivem em /api/adoption/*.
    void accountId
    return NextResponse.json({
      available: false,
      adoption_score: null,
      trend: null,
      features_at_risk: [],
      heatmap_data: [],
      blockers: [],
    })
  } catch (error) {
    console.error('[adoption-intelligence] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
