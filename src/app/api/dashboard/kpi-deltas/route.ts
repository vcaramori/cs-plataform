import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { getNPSSegment } from '@/lib/supabase/types'

export async function GET() {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })

    const admin = getSupabaseAdminClient()
    const now = new Date()
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000)

    const { data: accounts } = await supabase
      .from('accounts')
      .select('id, created_at, health_score, contracts(*)')

    const safeAccounts = accounts ?? []

    // Accounts delta: new accounts created in last 30d vs prior 30d
    const newAccountsCurrent = safeAccounts.filter(a =>
      new Date(a.created_at) >= thirtyDaysAgo
    ).length
    const newAccountsPrior = safeAccounts.filter(a => {
      const d = new Date(a.created_at)
      return d >= sixtyDaysAgo && d < thirtyDaysAgo
    }).length

    // MRR delta: current active vs contracts created before 30 days ago
    type ContractRow = { status: string; mrr: number | null; created_at: string }
    const currentMRR = safeAccounts.reduce((sum, a) => {
      const contracts = Array.isArray(a.contracts) ? a.contracts as unknown as ContractRow[] : []
      return sum + contracts
        .filter(c => c.status === 'active')
        .reduce((s, c) => s + (Number(c.mrr) || 0), 0)
    }, 0)

    const prevMRR = safeAccounts.reduce((sum, a) => {
      const contracts = Array.isArray(a.contracts) ? a.contracts as unknown as ContractRow[] : []
      return sum + contracts
        .filter(c => c.status === 'active' && new Date(c.created_at) < thirtyDaysAgo)
        .reduce((s, c) => s + (Number(c.mrr) || 0), 0)
    }, 0)

    // NPS delta: last 30d vs prior 30d
    const accountIds = safeAccounts.map(a => a.id)
    let npsCurrentScore: number | null = null
    let npsPriorScore: number | null = null

    if (accountIds.length > 0) {
      const { data: npsRecent } = await admin
        .from('nps_responses')
        .select('score')
        .in('account_id', accountIds)
        .gte('responded_at', thirtyDaysAgo.toISOString())
        .not('score', 'is', null)

      const { data: npsPrior } = await admin
        .from('nps_responses')
        .select('score')
        .in('account_id', accountIds)
        .gte('responded_at', sixtyDaysAgo.toISOString())
        .lt('responded_at', thirtyDaysAgo.toISOString())
        .not('score', 'is', null)

      if (npsRecent && npsRecent.length > 0) {
        let p = 0, d = 0
        for (const r of npsRecent) {
          const seg = getNPSSegment(r.score ?? 0)
          if (seg === 'promoter') p++
          else if (seg === 'detractor') d++
        }
        npsCurrentScore = Math.round(((p - d) / npsRecent.length) * 100)
      }

      if (npsPrior && npsPrior.length > 0) {
        let p = 0, d = 0
        for (const r of npsPrior) {
          const seg = getNPSSegment(r.score ?? 0)
          if (seg === 'promoter') p++
          else if (seg === 'detractor') d++
        }
        npsPriorScore = Math.round(((p - d) / npsPrior.length) * 100)
      }
    }

    const mrrDeltaPct = prevMRR > 0
      ? Math.round(((currentMRR - prevMRR) / prevMRR) * 100)
      : 0

    const npsDelta = npsCurrentScore !== null && npsPriorScore !== null
      ? npsCurrentScore - npsPriorScore
      : null

    return NextResponse.json({
      new_accounts_current: newAccountsCurrent,
      new_accounts_prior: newAccountsPrior,
      mrr_delta_pct: mrrDeltaPct,
      nps_delta: npsDelta,
    })
  } catch (error) {
    console.error('[kpi-deltas]', error)
    return NextResponse.json({ error: 'Internal error' }, { status: 500 })
  }
}
