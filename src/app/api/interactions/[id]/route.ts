import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'

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
    const { error } = await supabase
      .from('interactions')
      .delete()
      .eq('id', params.id)
      .eq('csm_id', user.id)

    if (error) throw error
    return new NextResponse(null, { status: 204 })
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 })
  }
}
