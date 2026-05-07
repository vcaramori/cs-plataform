import { notFound } from 'next/navigation'
import { getSupabaseServerClient } from '@/lib/supabase/server'
import { AccountHeader } from './components/AccountHeader'
import { AccountDetailPageClient } from './components/AccountDetailPageClient'

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
      ),
      account_playbooks (
        *,
        template:playbook_templates (*),
        tasks:account_playbook_tasks (
          *,
          task:playbook_tasks (*)
        )
      )
    `)
    .eq('id', id)
    .single()

  if (error || !account) notFound()

  // Normalização de arrays (Supabase pode retornar null para joins vazios)
  const contracts = Array.isArray(account.contracts) ? account.contracts : (account.contracts ? [account.contracts] : [])
  const contacts = Array.isArray(account.contacts) ? account.contacts : (account.contacts ? [account.contacts] : [])
  const interactions = Array.isArray(account.interactions) ? account.interactions : (account.interactions ? [account.interactions] : [])
  const tickets = Array.isArray(account.support_tickets) ? account.support_tickets : (account.support_tickets ? [account.support_tickets] : [])
  const entries = Array.isArray(account.time_entries) ? account.time_entries : (account.time_entries ? [account.time_entries] : [])
  const healthScores = Array.isArray(account.health_scores) ? account.health_scores : (account.health_scores ? [account.health_scores] : [])
  const successGoals = Array.isArray(account.success_goals) ? account.success_goals : (account.success_goals ? [account.success_goals] : [])
  const adoptionMetrics = Array.isArray(account.adoption_metrics) ? account.adoption_metrics : (account.adoption_metrics ? [account.adoption_metrics] : [])
  const adoptionRecords = Array.isArray(account.feature_adoption) ? account.feature_adoption : (account.feature_adoption ? [account.feature_adoption] : [])
  const playbooks = Array.isArray(account.account_playbooks) ? account.account_playbooks : (account.account_playbooks ? [account.account_playbooks] : [])
  const riskAssessments = Array.isArray(account.account_risk_assessments) ? account.account_risk_assessments : (account.account_risk_assessments ? [account.account_risk_assessments] : [])
  const npsResponses = Array.isArray(account.nps_responses) ? account.nps_responses : (account.nps_responses ? [account.nps_responses] : [])
  const commercialGovernance = Array.isArray(account.commercial_governance) ? account.commercial_governance : (account.commercial_governance ? [account.commercial_governance] : [])

  // Identificar o playbook ativo (em progresso)
  const activePlaybook = playbooks.find((pb: any) => pb.status === 'in_progress')

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

  return (
    <div className="p-6 space-y-6">
      <AccountHeader
        account={account as any}
        latestHealthScore={healthScores.sort((a: any, b: any) => new Date(b.evaluated_at).getTime() - new Date(a.evaluated_at).getTime())[0] ?? null}
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
        successGoals={successGoals}
        adoptionMetrics={adoptionMetrics}
        activePlaybook={activePlaybook}
        playbooks={playbooks}
        latestRiskAssessment={latestRiskAssessment}
        npsResponses={npsResponses}
        commercialGovernance={commercialGovernance}
        healthScores={healthScores}
      />
    </div>
  )
}
