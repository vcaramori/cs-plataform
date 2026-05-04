import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { SavedViewSchema, SavedViewResponseSchema } from '@/lib/schemas/savedView.schema'

export async function GET(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const { searchParams } = new URL(request.url)
  const entityType = searchParams.get('entity_type') ?? 'support_ticket'

  const { data, error } = await supabase
    .from('saved_views')
    .select('*')
    .eq('user_id', user.id)
    .eq('entity_type', entityType)
    .order('created_at', { ascending: false })

  if (error) return NextResponse.json({ error: error.message }, { status: 500 })
  return NextResponse.json(data)
}

export async function POST(request: Request) {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

  const body = await request.json()

  try {
    const validated = SavedViewSchema.parse(body)
    const { data, error } = await supabase
      .from('saved_views')
      .insert({
        user_id: user.id,
        ...validated,
      })
      .select()
      .single()

    if (error) {
      if (error.code === '23505') {
        return NextResponse.json(
          { error: 'A view with this name already exists' },
          { status: 400 }
        )
      }
      return NextResponse.json({ error: error.message }, { status: 500 })
    }

    const response = SavedViewResponseSchema.parse(data)
    return NextResponse.json(response, { status: 201 })
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
