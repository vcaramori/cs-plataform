import { NextResponse } from 'next/server'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getUserAccessScope } from '@/lib/auth/get-module-permission'
import { z } from 'zod'

const RenewalCardSchema = z.object({
  account_id: z.string().uuid(),
  account_name: z.string(),
  arr: z.number(),
  health_score: z.number().min(0).max(100),
  nps: z.number().nullable(),
  readiness_color: z.enum(['green', 'yellow', 'red']),
  days_to_renewal: z.number(),
})

const RenewalPipelineSchema = z.object({
  critico: z.array(RenewalCardSchema),
  urgente: z.array(RenewalCardSchema),
  planejamento: z.array(RenewalCardSchema),
})

type RenewalPipeline = z.infer<typeof RenewalPipelineSchema>

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

    // Build query based on role
    let query = supabase
      .from('accounts')
      .select(`
        id,
        name,
        health_score,
        contracts(arr, renewal_date),
        nps_responses(score)
      `)

    // Escopo dinâmico: global vê todo o pipeline; own apenas as próprias contas
    const scope = await getUserAccessScope(user.id, 'accounts')
    if (scope !== 'global') {
      query = query.eq('csm_owner_id', profile.id)
    }

    const { data: accounts } = await query

    if (!accounts || accounts.length === 0) {
      const emptyPipeline: RenewalPipeline = {
        critico: [],
        urgente: [],
        planejamento: [],
      }
      return NextResponse.json(emptyPipeline)
    }

    const today = new Date()
    const critico: z.infer<typeof RenewalCardSchema>[] = []
    const urgente: z.infer<typeof RenewalCardSchema>[] = []
    const planejamento: z.infer<typeof RenewalCardSchema>[] = []

    for (const account of accounts) {
      const contract = Array.isArray(account.contracts) ? account.contracts[0] : account.contracts

      if (!contract?.renewal_date) continue

      const renewalDate = new Date(contract.renewal_date)
      const daysToRenewal = Math.ceil(
        (renewalDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24)
      )

      // Only include renewals within next 90 days or overdue
      if (daysToRenewal > 90) continue

      // Get latest NPS
      const npsScores = Array.isArray(account.nps_responses)
        ? account.nps_responses.map(r => r.score).filter(Boolean)
        : []
      const latestNps = npsScores.length > 0 ? npsScores[0] : null

      // Determine readiness color
      const health = account.health_score || 0
      const nps = latestNps || 0
      let readiness_color: 'green' | 'yellow' | 'red'

      if (health >= 75 && nps >= 7) {
        readiness_color = 'green'
      } else if (health >= 50 || nps >= 7) {
        readiness_color = 'yellow'
      } else {
        readiness_color = 'red'
      }

      const card: z.infer<typeof RenewalCardSchema> = {
        account_id: account.id,
        account_name: account.name,
        arr: contract.arr || 0,
        health_score: health,
        nps: latestNps,
        readiness_color,
        days_to_renewal: daysToRenewal,
      }

      // Categorize by days to renewal
      if (daysToRenewal <= 30) {
        critico.push(card)
      } else if (daysToRenewal <= 60) {
        urgente.push(card)
      } else {
        planejamento.push(card)
      }
    }

    const pipeline: RenewalPipeline = {
      critico: critico.sort((a, b) => a.days_to_renewal - b.days_to_renewal),
      urgente: urgente.sort((a, b) => a.days_to_renewal - b.days_to_renewal),
      planejamento: planejamento.sort((a, b) => a.days_to_renewal - b.days_to_renewal),
    }

    return NextResponse.json(pipeline)
  } catch (error) {
    console.error('[renewal-pipeline] Error:', error)
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    )
  }
}