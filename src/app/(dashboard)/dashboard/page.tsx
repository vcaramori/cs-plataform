import { PageContainer } from "@/components/layout/PageContainer"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { computePortfolioKpis, computePortfolioNps } from "@/lib/dashboard/portfolio-kpis"
import { PortfolioHealthCard } from "./components/PortfolioHealthCard"
import { AccountsTable, type AccountWithContracts } from "./components/AccountsTable"

import { NPSTestLoader } from "./components/NPSTestLoader"
import { ModuleHeader } from "@/components/shared/guardians/ModuleHeader"
import RenewalPipelineSection from "./components/RenewalPipelineSection"
import { KPIDeltas } from "./components/KPIDeltas"
import { Suspense } from "react"


export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from("accounts")
    .select(`*, contracts(*), account_risk_assessments(*)`)
    .order("name")


  const safeAccounts = accounts ?? []

  const { totalMRR, atRisk, avgHealthScore: avgHealth, renewalsSoon, totalActiveContracts } =
    computePortfolioKpis(safeAccounts)

  // NPS Score global do portfólio
  let npsScore: number | null = null
  try {
    if (user) {
      npsScore = await computePortfolioNps(
        getSupabaseAdminClient(),
        safeAccounts.map(a => a.id)
      )
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
