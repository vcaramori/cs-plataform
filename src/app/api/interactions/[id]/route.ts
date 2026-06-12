import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { deleteInteractionCascade } from '@/lib/effort/effort-cascade'

export async function PATCH(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = await context.params

  try {
    const body = await request.json()
    const { data, error } = await supabase
      .from('interactions')
      .update({
        title: body.title,
        type: body.type,
        date: body.date,
        raw_transcript: body.raw_transcript,
        file_urls: body.file_urls,
      })
      .eq('id', params.id)
      .eq('csm_id', user.id) // Ensure only owner can update or via RLS
      .select()
      .single()

    if (error) throw error
    return NextResponse.json(data)
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}

export async function DELETE(request: Request, context: { params: Promise<{ id: string }> }) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const params = await context.params

  try {
    // Gate de propriedade
    const { data: owned } = await supabase
      .from('interactions')
      .select('id')
      .eq('id', params.id)
      .eq('csm_id', user.id)
      .single()
    if (!owned) return NextResponse.json({ error: 'Interação não encontrada ou sem acesso.' }, { status: 404 })

    // Cascade: limpa derivados (wishlist, RAG); se espelha um esforço, remove o esforço todo.
    const result = await deleteInteractionCascade(params.id, user.id)
    return NextResponse.json({ ok: true, ...result })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
