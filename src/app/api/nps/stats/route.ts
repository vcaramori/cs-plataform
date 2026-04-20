import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getNPSSegment } from '@/lib/supabase/types'

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const { searchParams } = new URL(request.url)
    const accountId   = searchParams.get('account_id')
    const emailFilter = searchParams.get('email')
    const programKey  = searchParams.get('program_key')

    const now = new Date()
    const defaultFrom = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const dateFrom = searchParams.get('date_from') ? new Date(searchParams.get('date_from')!) : defaultFrom
    const dateTo   = searchParams.get('date_to')   ? new Date(searchParams.get('date_to')!)   : now

    const db = supabase as any

    const { data: myAccounts } = await supabase.from('accounts').select('id, name').eq('csm_owner_id', user.id)
    const accountNamesMap = new Map((myAccounts || []).map(a => [a.id, a.name]))
    const targetAccountIds = accountId && accountId !== 'all' ? [accountId] : (myAccounts || []).map(a => a.id)

    let targetProgramKeys: string[] = []
    if (programKey && programKey !== 'default') {
      targetProgramKeys = [programKey]
    } else {
      const { data: defaults } = await supabase.from('nps_programs').select('program_key').eq('is_active', true).eq('is_default', true)
      targetProgramKeys = (defaults || []).map(p => p.program_key)
    }

    let query = db.from('nps_responses').select('*, nps_answers(*, nps_questions(*))').in('account_id', targetAccountIds).gte('responded_at', dateFrom.toISOString()).lte('responded_at', dateTo.toISOString())
    if (targetProgramKeys.length > 0) query = query.in('program_key', targetProgramKeys)
    if (emailFilter) query = query.ilike('user_email', `%${emailFilter}%`)

    const { data: responses, error } = await query.order('responded_at', { ascending: false })
    if (error) throw error

    const stats = {
      nps_score: 0,
      total_responses: responses.length,
      promoters: 0,
      passives: 0,
      detractors: 0,
      avg_score: 0,
      responses: (responses || []).map((r: any) => ({ ...r, account_name: accountNamesMap.get(r.account_id) || 'Global' }))
    }

    if (responses.length > 0) {
      let sum = 0
      responses.forEach((r: any) => {
        sum += r.score
        const seg = getNPSSegment(r.score)
        if (seg === 'promoter') stats.promoters++
        else if (seg === 'passive') stats.passives++
        else stats.detractors++
      })
      stats.nps_score = Math.round(((stats.promoters - stats.detractors) / responses.length) * 100)
      stats.avg_score = Number((sum / responses.length).toFixed(1))
    }

    return NextResponse.json(stats)
  } catch (err: any) {
    console.error('[API/NPS/STATS] Error:', err)
    return NextResponse.json({ error: 'Internal Server Error', message: err.message }, { status: 500 })
  }
}
