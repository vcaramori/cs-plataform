import { NextResponse } from 'next/server'
import { z } from 'zod'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AdoptionForecastRequestSchema, AdoptionForecastResponseSchema } from '@/lib/schemas/adoption.schema'
import { AdoptionService } from '@/lib/adoption/adoption-service'

export async function POST(request: Request) {
  try {
    const body = await request.json()
    const params = AdoptionForecastRequestSchema.safeParse(body)

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
    const forecast = await service.forecastAdoption(accountId, params.data.forecastDays)

    const responseWithAccountName = {
      ...forecast,
      accountId: accountId,
      accountName: account.name,
    }

    const validated = AdoptionForecastResponseSchema.safeParse(responseWithAccountName)
    if (!validated.success) {
      console.error('[adoption/forecast] Schema error:', validated.error)
      return NextResponse.json({ error: 'Invalid response' }, { status: 500 })
    }

    return NextResponse.json(validated.data, { status: 201 })
  } catch (error) {
    console.error('[adoption/forecast] Error:', error)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
