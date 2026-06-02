import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getModulePermission } from '@/lib/auth/get-module-permission'
import { CSOpsMetricsResponseSchema } from '@/lib/schemas/csOps.schema'
import { CSOperationsService } from '@/lib/cs-ops/cs-ops-service'

export async function GET(request: Request) {
  try {
    const supabase = (await getSupabaseServerClient()) as any;
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Gestores podem ver métricas do time (view_team dinâmico)
    if (!(await getModulePermission(user.id, 'esforco', 'view_team'))) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = new CSOperationsService(supabase)

    // Get all CSM profiles
    const { data: csms } = await supabase
      .from('profiles')
      .select('id, role')
      .in('role', ['csm', 'csm_senior', 'head_cs', 'account_manager', 'admin', 'super_admin'])

    // Calculate capacity for all CSMs
    const capacities = await Promise.all(
      (csms || []).map((csm: any) => service.calculateCapacity(csm.id))
    )

    const capacityUtilizations = capacities.map((c) => c.capacityUtilizationPct)
    const avgUtilization = capacityUtilizations.length > 0
      ? Math.round(capacityUtilizations.reduce((a, b) => a + b) / capacityUtilizations.length)
      : 0

    const overloadedCount = capacityUtilizations.filter((u) => u > 120).length
    const underutilizedCount = capacityUtilizations.filter((u) => u < 70).length

    // Calculate health metrics
    let totalNps = 0
    let totalCsat = 0
    let totalHealth = 0
    for (const csm of csms || []) {
      const health = await service.calculateHealth(csm.id)
      totalNps += health.avgNpsTeam || 0
      totalCsat += health.avgCsatScore || 0
      totalHealth += health.utilizationPct || 0
    }

    const count = csms?.length || 1
    const avgNps = Math.round(totalNps / count * 10) / 10
    const avgCsat = Math.round(totalCsat / count * 100) / 100

    // Shape "flat" consumido pelo CSOpsClient (cards de resumo do topo).
    // Todos os valores derivam de cálculo real — sem placeholders.
    const metrics = {
      snapshotDate: new Date().toISOString().split('T')[0],
      teamSize: csms?.length ?? 0,
      avgCapacityUtilization: avgUtilization,
      overloadedCount,
      underutilizedCount,
      avgNps,
      avgCsat,
    }

    const validated = CSOpsMetricsResponseSchema.safeParse(metrics)
    if (!validated.success) {
      console.error('[cs-ops/metrics] Schema error:', validated.error)
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error('[cs-ops/metrics] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
