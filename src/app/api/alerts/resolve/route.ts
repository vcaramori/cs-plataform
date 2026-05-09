import { NextResponse } from 'next/server'
import { ResolveAlertRequestSchema } from '@/lib/schemas/alerts.schema'
import { getSupabaseServerClient } from '@/lib/supabase/server'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = ResolveAlertRequestSchema.safeParse(body)

    if (!params.success) {
      return NextResponse.json({ error: params.error.flatten() }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Update alerts
    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'resolved',
        resolved_at: new Date().toISOString(),
        resolved_by: profile.id,
        resolution_notes: params.data.resolutionNotes,
      })
      .in('id', params.data.alertIds)

    if (error) {
      console.error('[alerts/resolve] Update error:', error)
      return NextResponse.json({ error: 'Failed to resolve alerts' }, { status: 500 })
    }

    return NextResponse.json(
      { success: true, resolvedCount: params.data.alertIds.length },
      { status: 200 }
    )
  } catch (error) {
    console.error('[alerts/resolve] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
