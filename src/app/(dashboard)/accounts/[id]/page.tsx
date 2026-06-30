import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { AccountHeader } from './components/AccountHeader'
import { AccountDetailPageClient } from './components/AccountDetailPageClient'
import { AccountWishlistCard } from './components/AccountWishlistCard'
import type {
  Contract, Interaction, SupportTicket, TimeEntry, Contact,
  SuccessPlanGoal, AdoptionMetrics, NPSResponse, CommercialGovernance,
  HealthScore,
} from '@/lib/supabase/types'

import { PageContainer } from '@/components/ui/page-container'

export default async function AccountDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await getSupabaseServerClient()


  // Buscar todos os dados da conta em uma única query expandida
  const { data: account, error } = await supabase
    .from('accounts')
    .select(`
      *,
      contracts (*),
      contacts (*),
      interactions (*),
      support_tickets (*),
      health_scores (*),
      time_entries (*),
      success_goals (*),
      adoption_metrics (*),
      feature_adoption (*),
      commercial_governance (*),
      account_risk_assessments (*),
      nps_responses (
        *,
        nps_answers (
          *,
          nps_questions (*)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !account) notFound()

  // Busca convites do portal para esta conta (service role para bypassar RLS)
  const admin = getSupabaseAdminClient() as any
  const { data: portalInvites } = await admin
    .from('portal_invites')
    .select('id, contact_id, email, status, invited_at, responded_at')
    .eq('account_id', id)

  // Normalização de arrays (Supabase pode retornar null para joins vazios)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const norm = (v: unknown): any[] => Array.isArray(v) ? v : v ? [v] : []
  const contracts        = norm(account.contracts)        as Contract[]
  const contacts         = norm(account.contacts)         as Contact[]
  const interactions     = norm(account.interactions)     as Interaction[]
  const tickets          = norm(account.support_tickets)  as SupportTicket[]
  const entries          = norm(account.time_entries)     as TimeEntry[]
  const healthScores     = norm(account.health_scores)    as HealthScore[]
  const successGoals     = norm(account.success_goals)    as SuccessPlanGoal[]
  const adoptionMetrics  = norm(account.adoption_metrics) as AdoptionMetrics[]
  const adoptionRecords  = norm(account.feature_adoption)
  const riskAssessments  = norm(account.account_risk_assessments)
  const npsResponses     = norm(account.nps_responses)    as NPSResponse[]
  const commercialGovernance = norm(account.commercial_governance) as CommercialGovernance[]

  // Identificar o último risk assessment da IA
  const latestRiskAssessment = riskAssessments.sort((a: any, b: any) => new Date(b.analyzed_at).getTime() - new Date(a.analyzed_at).getTime())[0] ?? null

  // Calcular Score de Adoção Real para o Header
  const total = adoptionRecords.length
  const inUse = adoptionRecords.filter((r: any) => r.status === 'in_use').length
  const partial = adoptionRecords.filter((r: any) => r.status === 'partial').length
  const blocked = adoptionRecords.filter((r: any) => r.status === 'blocked').length
  const notApplicable = adoptionRecords.filter((r: any) => r.status === 'na').length
  
  const totalExcluded = notApplicable
  const totalApplicable = total - totalExcluded
  const currentAdoptionScore = totalApplicable > 0 
    ? Math.round(((inUse + (partial * 0.5)) / totalApplicable) * 100) 
    : 0

  const activeContracts = contracts.filter((c: any) => c.status === 'active')
  const displayContracts = activeContracts.length > 0 ? activeContracts : (contracts.length > 0 ? [contracts[0]] : [])

  const sortedHealthScores = [...healthScores].sort((a: any, b: any) => {
    const evalDiff = new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime()
    if (evalDiff !== 0) return evalDiff
    return new Date(b.created_at).getTime() - new Date(a.created_at).getTime()
  })

  const mergedHealthScore = sortedHealthScores.length > 0 ? sortedHealthScores.reduce((acc: any, curr: any) => {
    const merged = { ...acc }
    for (const key in curr) {
      if (merged[key] == null && curr[key] != null) {
        merged[key] = curr[key]
      }
    }
    return merged
  }, { ...sortedHealthScores[0] }) : null

  return (
    <PageContainer noPadding className="p-6 space-y-6">
      <AccountHeader
        account={account as any}
        latestHealthScore={mergedHealthScore}
        currentAdoptionScore={currentAdoptionScore}
      />

      <AccountDetailPageClient
        id={id}
        accountName={account.name}
        displayContracts={displayContracts}
        contracts={contracts}
        interactions={interactions}
        tickets={tickets}
        efforts={entries}
        contacts={contacts}
        portalInvites={portalInvites ?? []}
        successGoals={successGoals}
        adoptionMetrics={adoptionMetrics}
        latestRiskAssessment={latestRiskAssessment}
        npsResponses={npsResponses}
        commercialGovernance={commercialGovernance}
        healthScores={healthScores}
      />

      <AccountWishlistCard accountId={id} />
    </PageContainer>
  )
}
