import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'

const SnoozeRequestSchema = z.object({
  alertIds: z.array(z.string().uuid()).min(1),
  snoozedUntil: z.string().datetime(),
})

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = SnoozeRequestSchema.safeParse(body)

    if (!params.success) {
      return NextResponse.json({ error: params.error.flatten() }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('id')
      .eq('auth_id', user.id)
      .single()

    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const { error } = await supabase
      .from('alerts')
      .update({
        status: 'dismissed',
        metadata: { snoozed: true, snoozed_until: params.data.snoozedUntil },
      })
      .in('id', params.data.alertIds)

    if (error) {
      console.error('[alerts/snooze] Update error:', error)
      return NextResponse.json({ error: 'Failed to snooze alerts' }, { status: 500 })
    }

    return NextResponse.json({ success: true, snoozedCount: params.data.alertIds.length })
  } catch (error) {
    console.error('[alerts/snooze] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
