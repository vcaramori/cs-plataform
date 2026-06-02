import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getModulePermission } from '@/lib/auth/get-module-permission'
import { ProductivityService, type ProductivityPeriod } from '@/lib/cs-ops/productivity-service'

export async function GET(
  request: Request,
  { params }: { params: Promise<{ csm_id: string }> }
) {
  try {
    const { csm_id } = await params
    const supabase = (await getSupabaseServerClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    // RBAC: o próprio CSM ou gestor
    const isSelf = profile.id === csm_id
    if (!isSelf && !(await getModulePermission(user.id, 'esforco', 'view_team'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const period = ((new URL(request.url)).searchParams.get('period') ?? 'month') as ProductivityPeriod
    const { start, end } = ProductivityService.resolvePeriod(
      ['week', 'month', 'quarter'].includes(period) ? period : 'month',
    )

    const service = new ProductivityService(supabase)
    const scorecard = await service.getPersonProductivity(csm_id, start, end)

    return NextResponse.json({ periodStart: start, periodEnd: end, scorecard })
  } catch (error) {
    console.error('[cs-ops/scorecard] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
