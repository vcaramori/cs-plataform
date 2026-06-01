import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { FeatureDependencyGraphResponseSchema } from '@/lib/schemas/adoption.schema'
import { AdoptionService } from '@/lib/adoption/adoption-service'

const QuerySchema = z.object({
  accountId: z.string().uuid().optional(),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const params = QuerySchema.safeParse({
      accountId: url.searchParams.get('accountId') || undefined,
    })

    if (!params.success) {
      return NextResponse.json({ error: params.error.flatten() }, { status: 400 })
    }

    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const accountId = params.data.accountId || '';

    // RLS check if not fetching for all accounts
    if (accountId) {
      const { data: account } = await supabase
        .from('accounts')
        .select('csm_owner_id')
        .eq('id', accountId)
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
      const canViewAll = ['csm_senior', 'admin'].includes(profile.role || '')

      if (!isOwner && !canViewAll) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
    }

    const service = new AdoptionService(supabase as any)
    const graph = await service.getFeatureDependencies(accountId)

    const validated = FeatureDependencyGraphResponseSchema.safeParse(graph)
    if (!validated.success) {
      console.error('[features/dependency-graph] Schema error:', validated.error)
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
    }

    return NextResponse.json(validated.data)
  } catch (error) {
    console.error('[features/dependency-graph] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
