import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { FeatureBlockersResponseSchema } from '@/lib/schemas/adoption.schema'
import { AdoptionService } from '@/lib/adoption/adoption-service'

const QuerySchema = z.object({
  accountId: z.string().uuid(),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const params = QuerySchema.safeParse({
      accountId: url.searchParams.get('accountId'),
    })

    if (!params.success) {
      return NextResponse.json({ error: params.error.flatten() }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // RLS check
    const { data: account } = await supabase
      .from('accounts')
      .select('id, csm_owner_id, name')
      .eq('id', params.data.accountId)
      .single()

    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!account || !profile) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 })
    }

    const isOwner = account.csm_owner_id === profile.id
    const canViewAll = ['csm_senior', 'admin'].includes(profile.role)

    if (!isOwner && !canViewAll) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const service = new AdoptionService(supabase)
    const blockers = await service.getFeatureBlockers(params.data.accountId)

    // Count by severity
    const bySeverity = blockers.reduce(
      (acc, b) => {
        const key = `${b.severity}Count` as keyof typeof acc
        acc[key] = (acc[key] || 0) + 1
        return acc
      },
      { criticalCount: 0, highCount: 0, mediumCount: 0, lowCount: 0 }
    )

    const response = {
      accountId: params.data.accountId,
      accountName: account.name,
      blockers,
      summary: {
        totalBlockers: blockers.length,
        ...bySeverity,
        topBlockers: blockers.slice(0, 3).map((b) => b.description),
      },
    }

    const validated = FeatureBlockersResponseSchema.safeParse(response)
    if (!validated.success) {
      console.error('[adoption/blockers] Schema error:', validated.error)
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error('[adoption/blockers] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
