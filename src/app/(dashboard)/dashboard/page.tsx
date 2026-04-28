import { PageContainer } from "@/components/layout/PageContainer"
import { Sparkles, LayoutDashboard } from "lucide-react"
import { getSupabaseServerClient } from "@/lib/supabase/server"
import { getSupabaseAdminClient } from "@/lib/supabase/admin"
import { getNPSSegment } from "@/lib/supabase/types"
import { PortfolioHealthCard } from "./components/PortfolioHealthCard"
import { AccountsTable } from "./components/AccountsTable"
import { NPSTestLoader } from "./components/NPSTestLoader"
import { ModuleHeader } from "@/components/shared/guardians/ModuleHeader"

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()

  const { data: accounts } = await supabase
    .from("accounts")
    .select(`*, contracts(id, mrr, arr, renewal_date, service_type, status, contracted_hours_monthly, csm_hour_cost)`)
    .order("name")

  const safeAccounts = accounts ?? []

  const totalMRR = safeAccounts.reduce((sum, a) => {
    const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
    const activeMRR = contracts
      .filter((c: any) => c.status === "active")
      .reduce((s: number, c: any) => s + (Number(c.mrr) || 0), 0)
    return sum + activeMRR
  }, 0)

  const atRisk = safeAccounts.filter(a => a.health_score < 40).length
  const avgHealth = safeAccounts.length
    ? Math.round(safeAccounts.reduce((sum, a) => sum + a.health_score, 0) / safeAccounts.length)
    : 0

  const today = new Date()
  const in30d = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const renewalsSoon = safeAccounts.filter(a => {
    const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
    const activeContracts = contracts.filter((c: any) => c.status === "active")
    
    return activeContracts.some((c: any) => {
      if (!c.renewal_date) return false
      const d = new Date(c.renewal_date)
      return d >= today && d <= in30d
    })
  }).length

  const totalActiveContracts = safeAccounts.reduce((sum, a) => {
    const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
    return sum + contracts.filter((c: any) => c.status === "active").length
  }, 0)

  // NPS Score global do portfólio
  let npsScore: number | null = null
  try {
    if (user) {
      const admin = getSupabaseAdminClient()
      const myAccountIds = safeAccounts.map((a: any) => a.id)
      if (myAccountIds.length > 0) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const { data: npsResponses } = await (admin as any)
          .from('nps_responses')
          .select('score')
          .in('account_id', myAccountIds)
          .eq('dismissed', false)
          .not('score', 'is', null)
        if (npsResponses && npsResponses.length > 0) {
          let promoters = 0, detractors = 0
          for (const r of npsResponses) {
            const seg = getNPSSegment(r.score)
            if (seg === 'promoter') promoters++
            else if (seg === 'detractor') detractors++
          }
          npsScore = Math.round(((promoters - detractors) / npsResponses.length) * 100)
        }
      }
    }
  } catch { /* NPS opcional — não quebra o dashboard */ }

  // Busca se há algum programa NPS em "Modo de Teste"
  const { data: testProgram } = await (getSupabaseAdminClient() as any)
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
        <PortfolioHealthCard
          totalAccounts={safeAccounts.length}
          totalActiveContracts={totalActiveContracts}
          totalMRR={totalMRR}
          avgHealthScore={avgHealth}
          atRisk={atRisk}
          renewalsSoon={renewalsSoon}
          npsScore={npsScore}
        />
      </section>

      {/* Main Table Section */}
      <section className="relative pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-primary/5 to-transparent pointer-events-none rounded-3xl" />
        <AccountsTable accounts={safeAccounts as any} />
      </section>
    </PageContainer>
  )
}
