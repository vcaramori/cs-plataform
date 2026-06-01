import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { ProductivityService, type ProductivityPeriod } from '@/lib/cs-ops/productivity-service'

const QuerySchema = z.object({
  period: z.enum(['week', 'month', 'quarter']).default('month'),
  csmId: z.string().uuid().optional(),
})

const TEAM_ROLES = ['csm_senior', 'head_cs', 'admin']

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const parsed = QuerySchema.safeParse({
      period: url.searchParams.get('period') ?? undefined,
      csmId: url.searchParams.get('csmId') ?? undefined,
    })
    if (!parsed.success) {
      return NextResponse.json({ error: parsed.error.flatten() }, { status: 400 })
    }

    const supabase = (await getSupabaseServerClient()) as any
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()
    if (!profile) return NextResponse.json({ error: 'Profile not found' }, { status: 404 })

    const period = parsed.data.period as ProductivityPeriod
    const { start, end } = ProductivityService.resolvePeriod(period)
    const service = new ProductivityService(supabase)

    const canViewTeam = TEAM_ROLES.includes(profile.role)

    // Pedido de uma pessoa específica
    if (parsed.data.csmId) {
      const isSelf = parsed.data.csmId === profile.id
      if (!isSelf && !canViewTeam) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      const person = await service.getPersonProductivity(parsed.data.csmId, start, end)
      return NextResponse.json({ period, periodStart: start, periodEnd: end, person })
    }

    // Visão de time
    if (!canViewTeam) {
      // CSM comum: devolve apenas o próprio scorecard, sem dados do time
      const person = await service.getPersonProductivity(profile.id, start, end)
      return NextResponse.json({ period, periodStart: start, periodEnd: end, person })
    }

    const team = await service.getTeamProductivity(period, start, end)
    return NextResponse.json(team)
  } catch (error) {
    console.error('[cs-ops/productivity] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
