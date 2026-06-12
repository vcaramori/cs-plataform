import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getEffortDeletionPreview } from '@/lib/effort/effort-cascade'

// Raio de impacto da exclusão de um esforço — alimenta o diálogo de confirmação.
export async function GET(
  _: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  // Gate de propriedade (idem DELETE)
  const { data: owned } = await supabase
    .from('time_entries')
    .select('id')
    .eq('id', id)
    .eq('csm_id', user.id)
    .single()
  if (!owned) return NextResponse.json({ error: 'Esforço não encontrado ou sem acesso.' }, { status: 404 })

  const preview = await getEffortDeletionPreview(id)
  if (!preview) return NextResponse.json({ error: 'Esforço não encontrado.' }, { status: 404 })
  return NextResponse.json(preview)
}
