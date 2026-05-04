import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { SavedViewUpdateSchema, SavedViewResponseSchema } from '@/lib/schemas/savedView.schema'

export async function PATCH(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: view, error: fetchError } = await supabase
    .from('saved_views')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'View not found' }, { status: 404 })
  }

  if (view.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const body = await request.json()

  try {
    const validated = SavedViewUpdateSchema.parse(body)
    const { data, error } = await supabase
      .from('saved_views')
      .update(validated)
      .eq('id', id)
      .select()
      .single()

    if (error) return NextResponse.json({ error: error.message }, { status: 500 })

    const response = SavedViewResponseSchema.parse(data)
    return NextResponse.json(response)
  } catch (err) {
    if (err instanceof Error && err.name === 'ZodError') {
      return NextResponse.json(
        { error: 'Invalid request body', details: err.message },
        { status: 400 }
      )
    }
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { data: view, error: fetchError } = await supabase
    .from('saved_views')
    .select('user_id')
    .eq('id', id)
    .single()

  if (fetchError) {
    return NextResponse.json({ error: 'View not found' }, { status: 404 })
  }

  if (view.user_id !== user.id) {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
  }

  const { error } = await supabase
    .from('saved_views')
    .delete()
    .eq('id', id)

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })

  return NextResponse.json({ success: true })
}
