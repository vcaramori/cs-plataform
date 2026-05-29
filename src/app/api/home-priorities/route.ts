import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AlertService } from '@/lib/alerts/alert-service'
import { isLeadershipRole } from '@/lib/auth/roles'
import type { UserRole } from '@/lib/supabase/types'
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
      .select('id, role')
      .eq('id', user.id)
      .single()

    if (!profile) {
      return NextResponse.json({ error: 'Profile not found' }, { status: 404 })
    }

    // Escopo role-aware: liderança vê o portfólio; CSM vê a própria carteira.
    const leadership = isLeadershipRole(profile.role as UserRole)
    let accountsQuery = supabase
      .from('accounts')
      .select(`
        id,
        name,
        segment,
        health_score,
        contracts(renewal_date, arr)
      `)
    if (!leadership) accountsQuery = accountsQuery.eq('csm_owner_id', profile.id)

    const { data: accounts } = await accountsQuery

    if (!accounts || accounts.length === 0) {
      return NextResponse.json([])
    }

    const alertService = new AlertService(supabase)
    const today = new Date()
    const priorities: any[] = []

    for (const account of accounts) {
      // 1. Run dynamic proactive alerts via AlertService
      const alerts = await alertService.evaluateAllAlerts(account.id, account.health_score || 50)
      
      let hasLowHealthAlert = false
      let hasRenewalAlert = false

      if (alerts && alerts.length > 0) {
        for (const alert of alerts) {
          if (!alert) continue
          let category: 'focar_agora' | 'manter_momentum' | 'oportunidade' = 'manter_momentum'
          let actionType = 'review'

          if (['churn_risk', 'playbook_trigger', 'nps_detractor_unactioned'].includes(alert.type)) {
            category = 'focar_agora'
            actionType = alert.type === 'playbook_trigger' ? 'playbook_execution' : 'csm_intervention'
            if (alert.type === 'churn_risk') hasLowHealthAlert = true
          } else if (alert.type === 'expansion_signal') {
            category = 'oportunidade'
            actionType = 'expansion_pitch'
          } else {
            category = 'manter_momentum'
            actionType = alert.type === 'renewal_upcoming' ? 'renewal_negotiation' : 'adoption_check'
            if (alert.type === 'renewal_upcoming') hasRenewalAlert = true
          }

          priorities.push({
            id: `${alert.type}-${account.id}`,
            csm_id: profile.id,
            account_id: account.id,
            category,
            reason: alert.message,
            score: alert.severity === 'critical' ? 90 : alert.severity === 'warning' ? 60 : 30,
            action_type: actionType,
            created_at: new Date().toISOString(),
            accounts: {
              name: account.name,
              segment: account.segment
            }
          })
        }
      }

      // 2. Fallbacks for standard criteria if no alerts are triggered
      const contract = Array.isArray(account.contracts) ? account.contracts[0] : account.contracts

      // Fallback Renewal priority (within 90 days)
      if (contract?.renewal_date && !hasRenewalAlert) {
        const renewalDate = new Date(contract.renewal_date)
        const daysToRenewal = Math.ceil((renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24))

        if (daysToRenewal > 0 && daysToRenewal <= 90) {
          priorities.push({
            id: `renewal-${account.id}`,
            csm_id: profile.id,
            account_id: account.id,
            category: daysToRenewal <= 30 ? 'focar_agora' : 'manter_momentum',
            reason: `Renovação contratual em ${daysToRenewal} dias (ARR: R$ ${(contract.arr || 0).toLocaleString()})`,
            score: daysToRenewal <= 30 ? 80 : 50,
            action_type: 'renewal_review',
            created_at: new Date().toISOString(),
            accounts: {
              name: account.name,
              segment: account.segment
            }
          })
        }
      }

      // Fallback Risk priority (low health score < 40)
      if (account.health_score < 40 && !hasLowHealthAlert) {
        priorities.push({
          id: `health-low-${account.id}`,
          csm_id: profile.id,
          account_id: account.id,
          category: 'focar_agora',
          reason: `Health Score crítico de ${account.health_score}% — intervenção emergencial necessária`,
          score: 85,
          action_type: 'health_remediation',
          created_at: new Date().toISOString(),
          accounts: {
            name: account.name,
            segment: account.segment
          }
        })
      }

      // Fallback Adoption priority (moderate health score 40-60)
      if (account.health_score >= 40 && account.health_score < 60 && (!alerts || alerts.length === 0)) {
        priorities.push({
          id: `health-mid-${account.id}`,
          csm_id: profile.id,
          account_id: account.id,
          category: 'manter_momentum',
          reason: `Health Score em ${account.health_score}% — monitorar engajamento e adoção`,
          score: 45,
          action_type: 'engagement_check',
          created_at: new Date().toISOString(),
          accounts: {
            name: account.name,
            segment: account.segment
          }
        })
      }
    }

    // Sort by priority score and return
    const sortedPriorities = priorities
      .sort((a, b) => b.score - a.score)
      .slice(0, 10) // Limit to top 10 relevant priorities

    return NextResponse.json(sortedPriorities)
  } catch (error) {
    console.error('[home-priorities] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}
