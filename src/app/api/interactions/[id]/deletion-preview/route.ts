import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getInteractionDeletionPreview } from '@/lib/effort/effort-cascade'

// Raio de impacto da exclusão de uma interação — alimenta o diálogo de confirmação.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: owned } = await supabase
    .from('interactions')
    .select('id')
    .eq('id', id)
    .eq('csm_id', user.id)
    .single()
  if (!owned) return NextResponse.json({ error: 'Interação não encontrada ou sem acesso.' }, { status: 404 })

  const preview = await getInteractionDeletionPreview(id)
  if (!preview) return NextResponse.json({ error: 'Interação não encontrada.' }, { status: 404 })
  return NextResponse.json(preview)
}
