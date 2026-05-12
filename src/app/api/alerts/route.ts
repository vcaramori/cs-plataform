import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AdvancedAlertsService } from '@/lib/alerts/advanced-alerts-service'
import { AlertsListResponseSchema } from '@/lib/schemas/alerts.schema'

const QuerySchema = z.object({
  alertType: z.string().optional(),
  severity: z.string().optional(),
  status: z.string().optional(),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const params = QuerySchema.safeParse({
      alertType: url.searchParams.get('alertType'),
      severity: url.searchParams.get('severity'),
      status: url.searchParams.get('status'),
    })

    if (!params.success) {
      return NextResponse.json({ error: params.error.flatten() }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's CSM profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    const service = new AdvancedAlertsService(supabase)
    const result = await service.getAlerts(profile.id, params.data)

    const validated = AlertsListResponseSchema.safeParse({
      alerts: result.alerts,
      summary: result.summary,
      filters: params.data,
    })

    if (!validated.success) {
      console.error('[alerts] Schema error:', validated.error)
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error('[alerts] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
