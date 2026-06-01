import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AdoptionService } from '@/lib/adoption/adoption-service'

const QuerySchema = z.object({
  accountId: z.string().uuid(),
  daysBack: z.string().optional().transform(v => v ? parseInt(v, 10) : 90),
})

export async function GET(request: Request) {
  try {
    const url = new URL(request.url)
    const params = QuerySchema.safeParse({
      accountId: url.searchParams.get('accountId'),
      daysBack: url.searchParams.get('daysBack'),
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

    // RLS check
    const { data: account } = await supabase
      .from('accounts')
      .select('id, csm_owner_id, name')
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

    const service = new AdoptionService(supabase as any)
    const heatmap = await service.getAdoptionHeatmap(accountId, params.data.daysBack)

    return NextResponse.json(heatmap)
  } catch (error) {
    console.error('[adoption/heatmap] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
