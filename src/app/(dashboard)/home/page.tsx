import { redirect } from 'next/navigation'
import { Suspense } from 'react'
import { toZonedTime } from 'date-fns-tz'
import { env } from '@/lib/env'
import { getSupabaseServerClient, getUserProfile } from '@/lib/supabase/server'
import { getSupabaseAdminClient } from '@/lib/supabase/admin'
import { isLeadershipRole } from '@/lib/auth/roles'
import { computePortfolioKpis, computePortfolioNps } from '@/lib/dashboard/portfolio-kpis'
import { PageContainer } from '@/components/ui/page-container'
import { PortfolioHealthCard } from '@/app/(dashboard)/dashboard/components/PortfolioHealthCard'
import { HomePrioritiesClient } from './components/HomePrioritiesClient'

import { Office365CalendarContainer } from './components/Office365CalendarContainer'
import { ReadAiConnectCard } from './components/ReadAiConnectCard'

function greetingForHour(hour: number): string {
  if (hour < 12) return 'Bom dia'
  if (hour < 18) return 'Boa tarde'
  return 'Boa noite'
}

export default async function HomePage() {
  const supabase = await getSupabaseServerClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/login')

  const profile = await getUserProfile(user.id)
  const leadership = isLeadershipRole(profile?.role)

  // Escopo role-aware: liderança vê o portfólio; CSM vê a própria carteira.
  let query = supabase
    .from('accounts')
    .select('*, contracts(*), account_risk_assessments(*)')
    .order('name')
  if (!leadership) query = query.eq('csm_owner_id', user.id)

  const { data: accounts } = await query
  const safeAccounts = accounts ?? []

  const kpis = computePortfolioKpis(safeAccounts)
  let npsScore: number | null = null
  try {
    npsScore = await computePortfolioNps(getSupabaseAdminClient(), safeAccounts.map(a => a.id))
  } catch (error) {
    console.error('[home] NPS error:', error)
  }

  // Buscar CSMs para o filtro do gestor
  let csms: { id: string, full_name: string }[] = []
  if (leadership) {
    const { data: csmData } = await supabase
      .from('profiles')
      .select('id, full_name')
      .in('role', ['csm', 'csm_senior'])
      .eq('is_active', true)
      .order('full_name')
    if (csmData) csms = csmData.map(c => ({ id: c.id, full_name: c.full_name ?? '' }))
  }

  // Saudação + contexto. O servidor roda em UTC (Vercel); a saudação e a data
  // precisam seguir o fuso da empresa, senão à tarde no Brasil já vira "Boa noite".
  const now = new Date()
  const tz = env.support.businessTimezone
  const localNow = toZonedTime(now, tz)
  const firstName = (profile?.full_name?.trim().split(/\s+/)[0]) || user.email?.split('@')[0] || ''
  const greeting = greetingForHour(localNow.getHours())
  const dateLabel = now.toLocaleDateString('pt-BR', { weekday: 'long', day: '2-digit', month: 'long', timeZone: tz })

  const contextParts: string[] = []
  if (kpis.atRisk > 0) contextParts.push(`${kpis.atRisk} ${kpis.atRisk === 1 ? 'conta em risco' : 'contas em risco'}`)
  if (kpis.renewalsSoon > 0) contextParts.push(`${kpis.renewalsSoon} ${kpis.renewalsSoon === 1 ? 'renovação' : 'renovações'} em 90d`)
  const contextLine = contextParts.length > 0
    ? `${leadership ? 'No portfólio' : 'Na sua carteira'}: ${contextParts.join(' · ')}.`
    : leadership
      ? 'Portfólio sob controle — nenhum risco ou renovação iminente.'
      : 'Sua carteira está sob controle — sem riscos ou renovações iminentes.'

  return (
    <PageContainer>
      {/* Saudação + contexto */}
      <div className="flex flex-col gap-1 relative">
        <div className="absolute -left-12 top-0 w-24 h-24 bg-primary/10 blur-[60px] rounded-full pointer-events-none" />
        <p className="text-[11px] font-bold uppercase tracking-widest text-content-secondary/70 capitalize">{dateLabel}</p>
        <h1 className="h1-page">{greeting}{firstName ? `, ${firstName}` : ''} 👋</h1>
        <p className="text-sm text-content-secondary">{contextLine}</p>
      </div>

      {/* Pulso de KPIs (escopo conforme o papel) */}
      <Suspense fallback={<div className="h-32 animate-pulse bg-accent/20 rounded-2xl" />}>
        <PortfolioHealthCard
          totalAccounts={kpis.totalAccounts}
          totalActiveContracts={kpis.totalActiveContracts}
          totalMRR={kpis.totalMRR}
          avgHealthScore={kpis.avgHealthScore}
          atRisk={kpis.atRisk}
          renewalsSoon={kpis.renewalsSoon}
          npsScore={npsScore}
        />
      </Suspense>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mt-2 items-start">
        {/* Ações de hoje (ocupa 2/3) */}
        <div className="lg:col-span-2 min-w-0">
          <HomePrioritiesClient />
        </div>

        {/* Agenda (ocupa 1/3) — fixa ao rolar a coluna longa de ações */}
        <div className="flex flex-col gap-4 self-start lg:sticky lg:top-6">
          <Office365CalendarContainer isLeadership={leadership} csms={csms} />
          <ReadAiConnectCard />
        </div>
      </div>
    </PageContainer>
  )
}
