import { getSupabaseServerClient } from '@/lib/supabase/server'
import { PortfolioHealthCard } from './components/PortfolioHealthCard'
import { AccountsTable } from './components/AccountsTable'

export default async function DashboardPage() {
  const supabase = await getSupabaseServerClient()

  const { data: accounts } = await supabase
    .from('accounts')
    .select(`*, contracts(id, mrr, arr, renewal_date, service_type, status, contracted_hours_monthly, csm_hour_cost)`)
    .order('name')

  const safeAccounts = accounts ?? []

  const totalMRR = safeAccounts.reduce((sum, a) => {
    const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
    const active = contracts.find((c: any) => c.status === 'active')
    return sum + (active?.mrr ?? 0)
  }, 0)

  const atRisk = safeAccounts.filter(a => a.health_score < 40).length
  const avgHealth = safeAccounts.length
    ? Math.round(safeAccounts.reduce((sum, a) => sum + a.health_score, 0) / safeAccounts.length)
    : 0

  const today = new Date()
  const in30d = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000)
  const renewalsSoon = safeAccounts.filter(a => {
    const contracts = Array.isArray(a.contracts) ? a.contracts : (a.contracts ? [a.contracts] : [])
    const active = contracts.find((c: any) => c.status === 'active')
    if (!active?.renewal_date) return false
    const d = new Date(active.renewal_date)
    return d >= today && d <= in30d
  }).length

  return (
    <div className="p-6 space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-slate-400 text-sm mt-1">Visão geral do portfólio de contas</p>
      </div>

      <PortfolioHealthCard
        totalAccounts={safeAccounts.length}
        totalMRR={totalMRR}
        avgHealthScore={avgHealth}
        atRisk={atRisk}
        renewalsSoon={renewalsSoon}
      />

      <AccountsTable accounts={safeAccounts as any} />
    </div>
  )
}
