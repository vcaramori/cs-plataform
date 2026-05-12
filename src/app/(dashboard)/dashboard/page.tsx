import { PageContainer } from "@/components/layout/PageContainer"
import { Sparkles, LayoutDashboard } from "lucide-react"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getNPSSegment } from "@/lib/supabase/types"
import { PortfolioHealthCard } from "./components/PortfolioHealthCard"
import { AccountsTable, type AccountWithContracts } from "./components/AccountsTable"

import { NPSTestLoader } from "./components/NPSTestLoader"
import { ModuleHeader } from "@/components/shared/guardians/ModuleHeader"
import RenewalPipelineSection from "./components/RenewalPipelineSection"
import { KPIDeltas } from "./components/KPIDeltas"
import { Suspense } from "react"
import type { Database } from "@/lib/supabase/database.types"

type ContractRow = Database['public']['Tables']['contracts']['Row']
type RiskAssessmentRow = Database['public']['Tables']['account_risk_assessments']['Row']


export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from("accounts")
    .select(`*, contracts(*), account_risk_assessments(*)`)
    .order("name")


  const safeAccounts = accounts ?? []

  const totalMRR = safeAccounts.reduce((sum, a) => {
    const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
    const activeMRR = contracts
      .filter((c: ContractRow) => c.status === "active")
      .reduce((s: number, c: ContractRow) => s + (Number(c.mrr) || 0), 0)

    return sum + activeMRR
  }, 0)

  const atRisk = safeAccounts.filter(a => {
    const healthRisk = a.health_score < 40
    const riskAssessments = Array.isArray(a.account_risk_assessments) ? a.account_risk_assessments : []
    const aiRisk = riskAssessments.some((r: RiskAssessmentRow) => r.risk_score >= 80 || r.sentiment_label === 'at-risk' || r.sentiment_label === 'negative')

    return healthRisk || aiRisk
  }).length
  const avgHealth = safeAccounts.length
    ? Math.round(safeAccounts.reduce((sum, a) => sum + a.health_score, 0) / safeAccounts.length)
    : 0

  const today = new Date()
  const in30d = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const renewalsSoon = safeAccounts.filter(a => {
    const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
    const activeContracts = contracts.filter((c: ContractRow) => c.status === "active")
    
    return activeContracts.some((c: ContractRow) => {

      if (!c.renewal_date) return false
      const d = new Date(c.renewal_date)
      return d >= today && d <= in30d
    })
  }).length

  const totalActiveContracts = safeAccounts.reduce((sum, a) => {
    const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
    return sum + contracts.filter((c: ContractRow) => c.status === "active").length

  }, 0)

  // NPS Score global do portfólio
  let npsScore: number | null = null
  try {
    if (user) {
      const admin = getSupabaseAdminClient()
      const myAccountIds = safeAccounts.map((a: Database['public']['Tables']['accounts']['Row']) => a.id)

      if (myAccountIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: npsResponses } = await admin
          .from('nps_responses')

          .select('score')
          .in('account_id', myAccountIds)
          .eq('dismissed', false)
          .not('score', 'is', null)
        if (npsResponses && npsResponses.length > 0) {
          let promoters = 0, detractors = 0
          for (const r of npsResponses) {
            if (r.score === null) continue
            const seg = getNPSSegment(r.score)
            if (seg === 'promoter') promoters++
            else if (seg === 'detractor') detractors++
          }
          npsScore = Math.round(((promoters - detractors) / npsResponses.length) * 100)
        }
      }
    }
  } catch (error) {
    console.error('Error fetching NPS score for dashboard:', error)
  }


  // Busca se há algum programa NPS em "Modo de Teste"
  const { data: testProgram } = await getSupabaseAdminClient()
    .from('nps_programs')

    .select('program_key')
    .eq('is_test_mode', true)
    .maybeSingle()

  return (
    <PageContainer>
      {/* Script de teste NPS se ativo */}
      {testProgram && user?.email && (
        <NPSTestLoader
          programKey={testProgram.program_key}
          userEmail={user.email}
          userId={user.id}
        />
      )}


      <ModuleHeader 
        title="Portfolio Control" 
        subtitle="Visão Executiva de Clientes e Receita Recorrente"
        iconName="LayoutDashboard"
      />

      {/* KPI Section */}
      <section className="relative">
        <Suspense fallback={<div className="h-32 animate-pulse bg-accent/20 rounded-2xl" />}>
          <PortfolioHealthCard
            totalAccounts={safeAccounts.length}
            totalActiveContracts={totalActiveContracts}
            totalMRR={totalMRR}
            avgHealthScore={avgHealth}
            atRisk={atRisk}
            renewalsSoon={renewalsSoon}
            npsScore={npsScore}
          />
        </Suspense>
      </section>

      {/* KPI Delta comparison */}
      <KPIDeltas />

      {/* Renewal Pipeline Kanban */}
      <section className="relative">
        <Suspense fallback={<div className="h-64 animate-pulse bg-accent/10 rounded-2xl" />}>
          <RenewalPipelineSection />
        </Suspense>
      </section>

      {/* Main Table Section */}
      <section className="relative pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none rounded-2xl" />
        <Suspense fallback={<div className="h-96 animate-pulse bg-accent/10 rounded-2xl" />}>
          <AccountsTable accounts={safeAccounts as unknown as AccountWithContracts[]} />
        </Suspense>
      </section>
    </PageContainer>
  )
}
