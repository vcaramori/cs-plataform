import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { CSMCapacityResponseSchema } from '@/lib/schemas/csOps.schema'
import { CSOperationsService } from '@/lib/cs-ops/cs-ops-service'

const QuerySchema = z.object({
  csmId: z.string().uuid(),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const params = QuerySchema.safeParse({
      csmId: url.searchParams.get('csmId'),
    })

    if (!params.success) {
      return NextResponse.json({ error: params.error.flatten() }, { status: 400 })
    }

    const supabase = (await getSupabaseServerClient()) as any;
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // RLS: CSM can see own, csm_senior/admin can see all
    const isSelf = profile.id === params.data.csmId
    const canViewAll = ['csm_senior', 'head_cs', 'admin', 'super_admin'].includes(profile.role)

    if (!isSelf && !canViewAll) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = new CSOperationsService(supabase)
    const capacity = await service.calculateCapacity(params.data.csmId)

    const validated = CSMCapacityResponseSchema.safeParse(capacity)
    if (!validated.success) {
      console.error('[cs-ops/capacity] Schema error:', validated.error)
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error('[cs-ops/capacity] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
