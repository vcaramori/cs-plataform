import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { z } from 'zod'

const PrioritySchema = z.object({
  rank: z.enum(['1', '2', '3']),
  type: z.enum(['renewal', 'risk', 'adoption', 'expansion']),
  account_id: z.string().uuid(),
  account_name: z.string(),
  reason: z.string(),
  due_date: z.string(),
  action_cta: z.string(),
})

type Priority = z.infer<typeof PrioritySchema>

export async function GET(request: Request) {
  try {
    const supabase = await getSupabaseServerClient()
    const { data: { user } } = await supabase.auth.getUser()

    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Get user's CSM profile
    const { data: profile } = await supabase
      .from('profiles')
      .select('id, role, csm_owner_id')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Get CSM-owned accounts
    const { data: accounts } = await supabase
      .from('accounts')
      .select(`
        id,
        name,
        health_score,
        contracts(renewal_date, arr)
      `)
      .eq('csm_owner_id', profile.id)

    if (!accounts || accounts.length === 0) {
      return NextResponse.json({ priorities: [] })
    }

    const today = new Date()
    const priorities: Priority[] = []

    // Build priorities from accounts
    for (const account of accounts) {
      const contract = Array.isArray(account.contracts) ? account.contracts[0] : account.contracts

      // Renewal priority (within 90 days)
      if (contract?.renewal_date) {
        const renewalDate = new Date(contract.renewal_date)
        const daysToRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysToRenewal > 0 && daysToRenewal <= 90) {
          const rank = daysToRenewal <= 30 ? '1' : daysToRenewal <= 60 ? '2' : '3'
          priorities.push({
            rank,
            type: 'renewal',
            account_id: account.id,
            account_name: account.name,
            reason: `Contract renewal in ${daysToRenewal} days (ARR: $${contract.arr || 0})`,
            due_date: renewalDate.toISOString().split('T')[0],
            action_cta: 'Plan Renewal',
          })
        }
      }

      // Risk priority (low health)
      if (account.health_score < 40) {
        priorities.push({
          rank: '1',
          type: 'risk',
          account_id: account.id,
          account_name: account.name,
          reason: `Health score at ${account.health_score}% — critical intervention needed`,
          due_date: today.toISOString().split('T')[0],
          action_cta: 'Review Health',
        })
      }

      // Adoption priority (moderate health warning)
      if (account.health_score >= 40 && account.health_score < 60) {
        priorities.push({
          rank: '2',
          type: 'adoption',
          account_id: account.id,
          account_name: account.name,
          reason: `Health score at ${account.health_score}% — monitor adoption closely`,
          due_date: today.toISOString().split('T')[0],
          action_cta: 'Check Adoption',
        })
      }
    }

    // Sort by rank and take top 3
    const sortedPriorities = priorities
      .sort((a, b) => parseInt(a.rank) - parseInt(b.rank))
      .slice(0, 3)

    return NextResponse.json({ priorities: sortedPriorities })
  } catch (error) {
    console.error('[home-priorities] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
